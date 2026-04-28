import { z } from "zod";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

type JsonObject = {
  [key: string]: JsonValue;
};

export type StoredAuthRailDecision = "ALLOW" | "DENY" | "APPROVAL_REQUIRED";
export type StoredActionRequestStatus =
  | "PROPOSED"
  | "ALLOWED"
  | "DENIED"
  | "APPROVAL_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "EXECUTING"
  | "EXECUTED"
  | "FAILED"
  | "CANCELED";
export type StoredExecutionMode = "DRY_RUN";
export type StoredExecutionStatus =
  | "PENDING"
  | "GRANT_ISSUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED";
export type ExecutionAuditEventType =
  | "EXECUTION_STARTED"
  | "EXECUTION_SUCCEEDED"
  | "EXECUTION_FAILED";

export type StoredExecutableActionRequest = {
  id: string;
  organizationId: string;
  agentId: string;
  connectorId: string | null;
  connectorType?: string | null;
  decision: StoredAuthRailDecision | null;
  status: StoredActionRequestStatus;
  operation?: string;
  resource?: JsonObject;
  parameters?: JsonObject;
};

export type PersistedExecutionAuditEventInput = {
  type: ExecutionAuditEventType;
  metadata: JsonObject;
};

export type PersistedDryRunExecutionInput = {
  actionRequestId: string;
  organizationId: string;
  agentId: string;
  connectorId: string | null;
  mode: StoredExecutionMode;
  status: Extract<StoredExecutionStatus, "SUCCEEDED">;
  metadata: JsonObject;
  auditEvents: PersistedExecutionAuditEventInput[];
};

export type DryRunExecutionPersistence = {
  findActionRequestForExecution: (
    actionRequestId: string,
  ) => Promise<StoredExecutableActionRequest | null>;
  createDryRunExecution: (
    input: PersistedDryRunExecutionInput,
  ) => Promise<{ executionId: string } | null>;
};

export type HandleDryRunExecutionInput = {
  actionRequestId: string;
  body: unknown;
  persistence: DryRunExecutionPersistence;
  stripeRefundExecutor?: StripeRefundExecutor;
};

export type HandleDryRunExecutionResponse = {
  status: number;
  body: JsonObject;
};

export type StripeRefundExecutor = (input: {
  actionRequestId: string;
}) => Promise<HandleDryRunExecutionResponse>;

const invalidPayloadResponse = {
  error: "invalid_payload",
  message: "Request body is invalid.",
} satisfies JsonObject;

const jsonObjectSchema = z.record(z.string(), z.json()).transform((value) => {
  return value as JsonObject;
});

const bodySchema = z
  .object({
    metadata: jsonObjectSchema.optional(),
  })
  .strict();

export async function handleDryRunExecution({
  actionRequestId,
  body,
  persistence,
  stripeRefundExecutor,
}: HandleDryRunExecutionInput): Promise<HandleDryRunExecutionResponse> {
  const parsedBody = bodySchema.safeParse(body);

  if (!parsedBody.success || actionRequestId.trim().length === 0) {
    return {
      status: 400,
      body: invalidPayloadResponse,
    };
  }

  let actionRequest: StoredExecutableActionRequest | null;

  try {
    actionRequest =
      await persistence.findActionRequestForExecution(actionRequestId);
  } catch {
    return failedClosedResponse("Action request lookup failed.");
  }

  if (!actionRequest) {
    return {
      status: 404,
      body: {
        error: "not_found",
        message: "Action request was not found.",
      },
    };
  }

  if (isStripeReflectedExecutionCandidate(actionRequest)) {
    if (!stripeRefundExecutor) {
      return failedClosedResponse("Stripe refund executor is not configured.");
    }

    return stripeRefundExecutor({
      actionRequestId: actionRequest.id,
    });
  }

  const executabilityError = getExecutabilityError(actionRequest);

  if (executabilityError) {
    return executabilityError;
  }

  const metadata = parsedBody.data.metadata ?? {};

  let execution: { executionId: string } | null;

  try {
    execution = await persistence.createDryRunExecution({
      actionRequestId: actionRequest.id,
      organizationId: actionRequest.organizationId,
      agentId: actionRequest.agentId,
      connectorId: actionRequest.connectorId,
      mode: "DRY_RUN",
      status: "SUCCEEDED",
      metadata,
      auditEvents: [
        {
          type: "EXECUTION_STARTED",
          metadata: {
            event: "execution_started",
            execution_mode: "dry_run",
            request_metadata: metadata,
          },
        },
        {
          type: "EXECUTION_SUCCEEDED",
          metadata: {
            event: "execution_succeeded",
            execution_mode: "dry_run",
            request_metadata: metadata,
          },
        },
      ],
    });
  } catch {
    return failedClosedResponse("Execution persistence failed.");
  }

  if (!execution) {
    return {
      status: 409,
      body: {
        error: "not_executable",
        message: "Action request is no longer executable.",
      },
    };
  }

  return {
    status: 200,
    body: {
      action_request_id: actionRequest.id,
      execution_id: execution.executionId,
      status: "SUCCEEDED",
      execution_mode: "dry_run",
      message: "Dry-run execution completed.",
    },
  };
}

function isStripeReflectedExecutionCandidate(
  actionRequest: StoredExecutableActionRequest,
): boolean {
  const resource = actionRequest.resource;
  const parameters = actionRequest.parameters;

  return (
    actionRequest.connectorType === "stripe_test" &&
    actionRequest.operation === "refund.create" &&
    Boolean(resource) &&
    (resource?.["type"] === "stripe.payment_intent" ||
      resource?.["type"] === "stripe.charge") &&
    Boolean(parameters) &&
    typeof parameters?.["amount_minor"] === "number"
  );
}

function getExecutabilityError(
  actionRequest: StoredExecutableActionRequest,
): HandleDryRunExecutionResponse | null {
  if (actionRequest.status === "EXECUTED") {
    return {
      status: 409,
      body: {
        error: "already_executed",
        message: "Action request has already been executed.",
      },
    };
  }

  if (actionRequest.status === "REJECTED") {
    return {
      status: 409,
      body: {
        error: "not_executable",
        message: "Rejected action requests cannot be executed.",
      },
    };
  }

  if (actionRequest.decision === "DENY" || actionRequest.status === "DENIED") {
    return {
      status: 409,
      body: {
        error: "not_executable",
        message: "Denied action requests cannot be executed.",
      },
    };
  }

  if (
    actionRequest.decision === "APPROVAL_REQUIRED" &&
    actionRequest.status === "APPROVAL_REQUIRED"
  ) {
    return {
      status: 409,
      body: {
        error: "not_executable",
        message: "Action request must be approved before execution.",
      },
    };
  }

  if (
    actionRequest.decision !== "APPROVAL_REQUIRED" ||
    actionRequest.status !== "APPROVED"
  ) {
    return {
      status: 409,
      body: {
        error: "not_executable",
        message: "Only approved action requests can be executed.",
      },
    };
  }

  return null;
}

function failedClosedResponse(message: string): HandleDryRunExecutionResponse {
  return {
    status: 500,
    body: {
      error: "execution_failed",
      message,
    },
  };
}
