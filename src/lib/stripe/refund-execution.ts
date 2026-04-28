import { createHash, randomUUID } from "node:crypto";
import { env as processEnv } from "node:process";

import {
  getStripeSafetyConfig,
  redactSecret,
  type StripeSafetyEnv,
} from "./config";
import { getStripeTestClient } from "./client";
import {
  createSafeRefundSnapshot,
  normalizeStripeAmountMinor,
} from "./snapshots";
import {
  createHumanActorAuditMetadata,
  type HumanActionActor,
} from "../auth/action-actor";

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

type ActionRequestStatus =
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

type StripeRefundCreateParams = {
  payment_intent?: string;
  charge?: string;
  amount: number;
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  metadata?: {
    refundhold_action_request_id: string;
    refundhold_execution_id: string;
    refundhold_mode: "test";
  };
};

type StripeRefundCreateOptions = {
  idempotencyKey: string;
};

export type StripeRefundExecutionClient = {
  refunds: {
    create: (
      params: StripeRefundCreateParams,
      options: StripeRefundCreateOptions,
    ) => Promise<unknown>;
  };
};

export type StoredStripePaymentObjectForRefund = {
  id: string;
  organizationId: string;
  connectorId: string;
  mode: "TEST" | "LIVE";
  paymentIntentId?: string;
  chargeId?: string;
  amountMinor: number;
  amountRefundedMinor: number;
  currency: string;
  status: string;
  livemode: boolean;
  safeSnapshot: JsonObject;
};

export type StoredStripeRefundExecutableActionRequest = {
  id: string;
  organizationId: string;
  agentId: string;
  connectorId: string;
  connectorType: string;
  decision: "ALLOW" | "DENY" | "APPROVAL_REQUIRED" | null;
  status: ActionRequestStatus;
  operation: string;
  resource: JsonObject;
  parameters: JsonObject;
  approvedApprovalId: string | null;
  stripePaymentObject: StoredStripePaymentObjectForRefund | null;
  existingStripeRefund: {
    id: string;
    stripeRefundId: string | null;
    stripeStatus: string | null;
  } | null;
  completedExecution: {
    id: string;
    status: "SUCCEEDED";
  } | null;
};

export type StripeExecutionAuditEventInput = {
  type:
    | "EXECUTION_STARTED"
    | "STRIPE_REFUND_REQUESTED"
    | "STRIPE_REFUND_SUCCEEDED"
    | "STRIPE_REFUND_FAILED"
    | "EXECUTION_SUCCEEDED"
    | "EXECUTION_FAILED";
  metadata: JsonObject;
};

export type BeginStripeTestRefundExecutionInput = {
  actionRequestId: string;
  organizationId: string;
  agentId: string;
  connectorId: string;
  executionId: string;
  executionStatus: "RUNNING";
  mode: "DIRECT";
  stripeMode: "TEST";
  stripeRefundStatus: "pending";
  paymentIntentId?: string;
  chargeId?: string;
  amountMinor: number;
  currency: string;
  reason?: string;
  idempotencyKeyHash: string;
  auditEvents: StripeExecutionAuditEventInput[];
};

export type MarkStripeTestRefundExecutionSucceededInput = {
  actionRequestId: string;
  organizationId: string;
  agentId: string;
  executionId: string;
  stripeRefundId: string;
  stripeStatus: string;
  stripeRequestId?: string;
  safeResponse: JsonObject;
  auditEvents: StripeExecutionAuditEventInput[];
};

export type MarkStripeTestRefundExecutionFailedInput = {
  actionRequestId: string;
  organizationId: string;
  agentId: string;
  executionId: string;
  stripeStatus: "failed";
  safeError: JsonObject;
  auditEvents: StripeExecutionAuditEventInput[];
};

export type StripeTestRefundExecutionPersistence = {
  findActionRequestForStripeRefundExecution: (
    actionRequestId: string,
  ) => Promise<StoredStripeRefundExecutableActionRequest | null>;
  beginStripeTestRefundExecution: (
    input: BeginStripeTestRefundExecutionInput,
  ) => Promise<{ executionId: string } | null>;
  markStripeTestRefundExecutionSucceeded: (
    input: MarkStripeTestRefundExecutionSucceededInput,
  ) => Promise<void>;
  markStripeTestRefundExecutionFailed: (
    input: MarkStripeTestRefundExecutionFailedInput,
  ) => Promise<void>;
};

export type ExecuteStripeTestRefundForActionRequestInput = {
  actionRequestId: string;
  persistence: StripeTestRefundExecutionPersistence;
  actor?: HumanActionActor;
  stripeClient?: StripeRefundExecutionClient;
  env?: StripeSafetyEnv;
  createExecutionId?: () => string;
};

export type ExecuteStripeTestRefundForActionRequestResponse = {
  status: number;
  body: JsonObject;
};

type PreparedStripeRefundExecution = {
  actionRequest: StoredStripeRefundExecutableActionRequest;
  amountMinor: number;
  currency: string;
  paymentIntentId?: string;
  chargeId?: string;
  reason?: string;
};

export async function executeStripeTestRefundForActionRequest({
  actionRequestId,
  persistence,
  actor,
  stripeClient,
  env = processEnv,
  createExecutionId = createDefaultExecutionId,
}: ExecuteStripeTestRefundForActionRequestInput): Promise<ExecuteStripeTestRefundForActionRequestResponse> {
  if (actionRequestId.trim().length === 0) {
    return {
      status: 400,
      body: {
        error: "invalid_payload",
        message: "Action request id is required.",
      },
    };
  }

  const configResult = getStripeExecutionConfig(env);

  if (!configResult.ok) {
    return failedClosedResponse(configResult.message);
  }

  let actionRequest: StoredStripeRefundExecutableActionRequest | null;

  try {
    actionRequest =
      await persistence.findActionRequestForStripeRefundExecution(
        actionRequestId,
      );
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

  const preparedResult = prepareStripeRefundExecution(actionRequest);

  if (!preparedResult.ok) {
    return preparedResult.response;
  }

  const executionId = createExecutionId();
  const idempotencyKey = createStripeRefundIdempotencyKey(executionId);
  const idempotencyKeyHash = hashIdempotencyKey(idempotencyKey);
  const { actionRequest: executableActionRequest } = preparedResult;
  const beginResult = await beginStripeRefundExecution({
    persistence,
    executionId,
    idempotencyKeyHash,
    prepared: preparedResult,
    actor,
  });

  if (!beginResult.ok) {
    return beginResult.response;
  }

  const client = stripeClient ?? getStripeTestClient(env);

  try {
    const stripeRefund = await client.refunds.create(
      buildStripeRefundCreateParams(preparedResult, executionId),
      {
        idempotencyKey,
      },
    );
    const safeResponse = createSafeStripeRefundResponse(stripeRefund);

    await persistence.markStripeTestRefundExecutionSucceeded({
      actionRequestId: executableActionRequest.id,
      organizationId: executableActionRequest.organizationId,
      agentId: executableActionRequest.agentId,
      executionId,
      stripeRefundId: safeResponse.refundId as string,
      stripeStatus: safeResponse.status as string,
      stripeRequestId: getStripeRequestId(stripeRefund),
      safeResponse,
      auditEvents: [
        {
          type: "STRIPE_REFUND_SUCCEEDED",
          metadata: withDefinedValues({
            event: "stripe_refund_succeeded",
            execution_mode: "stripe_test_refund",
            stripe_refund_id: safeResponse.refundId,
            stripe_status: safeResponse.status,
            payment_intent_id: safeResponse.paymentIntentId,
            charge_id: safeResponse.chargeId,
            amount_minor: safeResponse.amountMinor,
            currency: safeResponse.currency,
            livemode: false,
            ...createHumanActorAuditMetadata(actor),
          }),
        },
        {
          type: "EXECUTION_SUCCEEDED",
          metadata: {
            event: "execution_succeeded",
            execution_mode: "stripe_test_refund",
            ...createHumanActorAuditMetadata(actor),
          },
        },
      ],
    });

    return {
      status: 200,
      body: {
        action_request_id: executableActionRequest.id,
        execution_id: executionId,
        stripe_refund_id: safeResponse.refundId,
        status: "SUCCEEDED",
        execution_mode: "stripe_test_refund",
        message: "Stripe test-mode refund completed.",
      },
    };
  } catch (error) {
    await persistence.markStripeTestRefundExecutionFailed({
      actionRequestId: executableActionRequest.id,
      organizationId: executableActionRequest.organizationId,
      agentId: executableActionRequest.agentId,
      executionId,
      stripeStatus: "failed",
      safeError: buildSafeStripeError(error),
      auditEvents: [
        {
          type: "STRIPE_REFUND_FAILED",
          metadata: {
            event: "stripe_refund_failed",
            execution_mode: "stripe_test_refund",
            ...createHumanActorAuditMetadata(actor),
          },
        },
        {
          type: "EXECUTION_FAILED",
          metadata: {
            event: "execution_failed",
            execution_mode: "stripe_test_refund",
            ...createHumanActorAuditMetadata(actor),
          },
        },
      ],
    });

    return failedClosedResponse("Stripe test refund execution failed.");
  }
}

function getStripeExecutionConfig(
  env: StripeSafetyEnv,
):
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    } {
  try {
    const config = getStripeSafetyConfig(env);

    if (!config.testRefundsEnabled) {
      return {
        ok: false,
        message:
          "AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED is required for Stripe test refund execution.",
      };
    }

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error && error.message.trim().length > 0
          ? redactStripeSecretsInMessage(error.message)
          : "Stripe test refund execution config is invalid.",
    };
  }
}

function prepareStripeRefundExecution(
  actionRequest: StoredStripeRefundExecutableActionRequest,
):
  | (PreparedStripeRefundExecution & {
      ok: true;
    })
  | {
      ok: false;
      response: ExecuteStripeTestRefundForActionRequestResponse;
    } {
  const executabilityError = getStripeExecutabilityError(actionRequest);

  if (executabilityError) {
    return {
      ok: false,
      response: executabilityError,
    };
  }

  const stripePaymentObject = actionRequest.stripePaymentObject;

  if (!stripePaymentObject) {
    return {
      ok: false,
      response: notExecutableResponse(
        "Stripe payment object is required before Stripe execution.",
      ),
    };
  }

  if (stripePaymentObject.organizationId !== actionRequest.organizationId) {
    return {
      ok: false,
      response: notExecutableResponse(
        "Stripe payment object organization does not match the action request.",
      ),
    };
  }

  if (stripePaymentObject.connectorId !== actionRequest.connectorId) {
    return {
      ok: false,
      response: notExecutableResponse(
        "Stripe payment object connector does not match the action request.",
      ),
    };
  }

  if (stripePaymentObject.mode !== "TEST") {
    return {
      ok: false,
      response: notExecutableResponse(
        "Stripe payment object must be test mode for v1 execution.",
      ),
    };
  }

  if (stripePaymentObject.livemode) {
    return {
      ok: false,
      response: notExecutableResponse(
        "Stripe payment object is live mode; v1 only executes test mode.",
      ),
    };
  }

  const amountMinor = readRefundAmountMinor(actionRequest.parameters);
  const refundableAmountMinor =
    stripePaymentObject.amountMinor - stripePaymentObject.amountRefundedMinor;

  if (refundableAmountMinor < 0 || amountMinor > refundableAmountMinor) {
    return {
      ok: false,
      response: notExecutableResponse(
        "Requested refund amount exceeds the refundable Stripe amount.",
      ),
    };
  }

  const target = getStripeRefundTarget(actionRequest, stripePaymentObject);

  if (!target.ok) {
    return {
      ok: false,
      response: notExecutableResponse(target.message),
    };
  }

  return {
    ok: true,
    actionRequest,
    amountMinor,
    currency: stripePaymentObject.currency,
    reason: getStripeRefundReason(actionRequest.parameters),
    paymentIntentId: target.paymentIntentId,
    chargeId: target.chargeId,
  };
}

function getStripeExecutabilityError(
  actionRequest: StoredStripeRefundExecutableActionRequest,
): ExecuteStripeTestRefundForActionRequestResponse | null {
  if (actionRequest.existingStripeRefund) {
    return {
      status: 409,
      body: {
        error: "already_executed",
        message: "Stripe refund already exists for this action request.",
      },
    };
  }

  if (actionRequest.completedExecution) {
    return {
      status: 409,
      body: {
        error: "already_executed",
        message: "Action request already has a completed execution.",
      },
    };
  }

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
    return notExecutableResponse("Rejected action requests cannot be executed.");
  }

  if (actionRequest.decision === "DENY" || actionRequest.status === "DENIED") {
    return notExecutableResponse("Denied action requests cannot be executed.");
  }

  if (actionRequest.status === "APPROVAL_REQUIRED") {
    return notExecutableResponse(
      "Action request must be approved before Stripe execution.",
    );
  }

  if (
    actionRequest.decision !== "APPROVAL_REQUIRED" ||
    actionRequest.status !== "APPROVED"
  ) {
    return notExecutableResponse(
      "Only approved action requests can be executed.",
    );
  }

  if (!actionRequest.approvedApprovalId) {
    return notExecutableResponse(
      "Action request approval record is required before Stripe execution.",
    );
  }

  if (
    actionRequest.connectorType !== "stripe_test" ||
    actionRequest.operation !== "refund.create"
  ) {
    return notExecutableResponse(
      "Action request is not a Stripe test refund request.",
    );
  }

  return null;
}

async function beginStripeRefundExecution({
  persistence,
  executionId,
  idempotencyKeyHash,
  prepared,
  actor,
}: {
  persistence: StripeTestRefundExecutionPersistence;
  executionId: string;
  idempotencyKeyHash: string;
  prepared: PreparedStripeRefundExecution;
  actor?: HumanActionActor;
}): Promise<
  | {
      ok: true;
    }
  | {
      ok: false;
      response: ExecuteStripeTestRefundForActionRequestResponse;
    }
> {
  const { actionRequest } = prepared;

  try {
    const result = await persistence.beginStripeTestRefundExecution({
      actionRequestId: actionRequest.id,
      organizationId: actionRequest.organizationId,
      agentId: actionRequest.agentId,
      connectorId: actionRequest.connectorId,
      executionId,
      executionStatus: "RUNNING",
      mode: "DIRECT",
      stripeMode: "TEST",
      stripeRefundStatus: "pending",
      paymentIntentId: prepared.paymentIntentId,
      chargeId: prepared.chargeId,
      amountMinor: prepared.amountMinor,
      currency: prepared.currency,
      reason: prepared.reason,
      idempotencyKeyHash,
      auditEvents: [
        {
          type: "EXECUTION_STARTED",
          metadata: {
            event: "execution_started",
            execution_mode: "stripe_test_refund",
            ...createHumanActorAuditMetadata(actor),
          },
        },
        {
          type: "STRIPE_REFUND_REQUESTED",
          metadata: withDefinedValues({
            event: "stripe_refund_requested",
            execution_mode: "stripe_test_refund",
            payment_intent_id: prepared.paymentIntentId,
            charge_id: prepared.chargeId,
            amount_minor: prepared.amountMinor,
            currency: prepared.currency,
            livemode: false,
            ...createHumanActorAuditMetadata(actor),
          }),
        },
      ],
    });

    if (!result) {
      return {
        ok: false,
        response: {
          status: 409,
          body: {
            error: "not_executable",
            message: "Action request is no longer executable.",
          },
        },
      };
    }

    return {
      ok: true,
    };
  } catch {
    return {
      ok: false,
      response: failedClosedResponse("Stripe execution persistence failed."),
    };
  }
}

function buildStripeRefundCreateParams({
  paymentIntentId,
  chargeId,
  amountMinor,
  reason,
  actionRequest,
}: PreparedStripeRefundExecution, executionId: string): StripeRefundCreateParams {
  return withDefinedValues({
    payment_intent: paymentIntentId,
    charge: paymentIntentId ? undefined : chargeId,
    amount: amountMinor,
    reason: isStripeRefundReason(reason) ? reason : undefined,
    metadata: {
      refundhold_action_request_id: actionRequest.id,
      refundhold_execution_id: executionId,
      refundhold_mode: "test",
    },
  }) as StripeRefundCreateParams;
}

function createSafeStripeRefundResponse(refund: unknown): JsonObject {
  if (!isRecord(refund)) {
    throw new Error("Stripe refund response was incomplete.");
  }

  const snapshot = createSafeRefundSnapshot(refund);
  const reason = typeof refund.reason === "string" ? refund.reason : undefined;

  return withDefinedValues({
    refundId: snapshot.refundId,
    paymentIntentId: snapshot.paymentIntentId,
    chargeId: snapshot.chargeId,
    amountMinor: snapshot.amountMinor,
    currency: snapshot.currency,
    status: snapshot.status,
    livemode: false,
    created: snapshot.created,
    reason,
  });
}

function getStripeRefundTarget(
  actionRequest: StoredStripeRefundExecutableActionRequest,
  stripePaymentObject: StoredStripePaymentObjectForRefund,
):
  | {
      ok: true;
      paymentIntentId?: string;
      chargeId?: string;
    }
  | {
      ok: false;
      message: string;
    } {
  const resourceType =
    typeof actionRequest.resource["type"] === "string"
      ? actionRequest.resource["type"]
      : undefined;

  if (resourceType === "stripe.payment_intent") {
    if (!stripePaymentObject.paymentIntentId) {
      return {
        ok: false,
        message: "Stripe PaymentIntent id is required for execution.",
      };
    }

    return {
      ok: true,
      paymentIntentId: stripePaymentObject.paymentIntentId,
      chargeId: stripePaymentObject.chargeId,
    };
  }

  if (resourceType === "stripe.charge") {
    if (!stripePaymentObject.chargeId) {
      return {
        ok: false,
        message: "Stripe Charge id is required for execution.",
      };
    }

    return {
      ok: true,
      chargeId: stripePaymentObject.chargeId,
    };
  }

  return {
    ok: false,
    message:
      "Stripe refund execution requires resource stripe.payment_intent or stripe.charge.",
  };
}

function readRefundAmountMinor(parameters: JsonObject): number {
  return normalizeStripeAmountMinor(parameters["amount_minor"]);
}

function getStripeRefundReason(parameters: JsonObject): string | undefined {
  return typeof parameters["reason"] === "string"
    ? parameters["reason"]
    : undefined;
}

function isStripeRefundReason(
  value: string | undefined,
): value is "duplicate" | "fraudulent" | "requested_by_customer" {
  return (
    value === "duplicate" ||
    value === "fraudulent" ||
    value === "requested_by_customer"
  );
}

function getStripeRequestId(refund: unknown): string | undefined {
  if (!isRecord(refund) || !isRecord(refund.lastResponse)) {
    return undefined;
  }

  const requestId = refund.lastResponse["requestId"];

  return typeof requestId === "string" && requestId.trim().length > 0
    ? requestId.trim()
    : undefined;
}

function buildSafeStripeError(error: unknown): JsonObject {
  if (error instanceof Error && error.message.trim().length > 0) {
    return {
      message: redactStripeSecretsInMessage(error.message),
    };
  }

  return {
    message: "Stripe refund execution failed.",
  };
}

function createStripeRefundIdempotencyKey(executionId: string): string {
  return `refundhold:test:refund:${executionId}`;
}

function hashIdempotencyKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function createDefaultExecutionId(): string {
  return `exec_${randomUUID()}`;
}

function failedClosedResponse(
  message: string,
): ExecuteStripeTestRefundForActionRequestResponse {
  return {
    status: 500,
    body: {
      error: "execution_failed",
      message,
    },
  };
}

function notExecutableResponse(
  message: string,
): ExecuteStripeTestRefundForActionRequestResponse {
  return {
    status: 409,
    body: {
      error: "not_executable",
      message,
    },
  };
}

function redactStripeSecretsInMessage(message: string): string {
  return message.replace(
    /\b(?:(?:sk|rk)_(?:test|live)_[A-Za-z0-9_]+|whsec_[A-Za-z0-9_]+)\b/g,
    (value) => redactSecret(value),
  );
}

function withDefinedValues(
  object: Record<string, JsonValue | undefined>,
): JsonObject {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  ) as JsonObject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
