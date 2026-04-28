import { z } from "zod";

import {
  evaluatePolicies,
  type Policy,
  type PolicyDecision,
  type PolicyEvaluationResult,
  type PolicyRules,
} from "../policies/evaluator";
import { verifyApiKey } from "../security/api-keys";
import { redactSecret } from "../stripe/config";
import type {
  ReflectedStripePaymentObject,
  ReflectStripeTestPaymentObjectInput,
} from "../stripe/payment-reflection";
import type { StripePaymentTarget } from "../stripe/types";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

export type JsonObject = {
  [key: string]: JsonValue;
};

export type StoredAuthRailDecision = "ALLOW" | "DENY" | "APPROVAL_REQUIRED";
export type StoredActionRequestStatus =
  | "ALLOWED"
  | "DENIED"
  | "APPROVAL_REQUIRED";
export type StoredPolicyStatus = "DRAFT" | "ACTIVE" | "DISABLED" | "ARCHIVED";
export type StoredAgentStatus = "ACTIVE" | "DISABLED";

export type StoredAgentApiKey = {
  id: string;
  keyPrefix: string;
  keyHash: string;
  agentId: string;
  organizationId: string;
  agentStatus: StoredAgentStatus;
};

export type StoredPolicy = {
  id: string;
  organizationId: string;
  connectorId: string | null;
  name: string;
  decision: StoredAuthRailDecision;
  priority: number;
  status: StoredPolicyStatus;
  rules: unknown;
};

export type StoredConnector = {
  id: string;
  organizationId: string;
  type: string;
  status: "ACTIVE" | "DISABLED";
};

export type PersistedAuditEventInput = {
  type:
    | "STRIPE_PAYMENT_OBJECT_REFLECTED"
    | "REQUEST_RECEIVED"
    | "POLICY_EVALUATED"
    | "DECISION_CREATED"
    | "APPROVAL_REQUESTED";
  actorType: "AGENT" | "SYSTEM";
  agentId: string;
  metadata: JsonObject;
};

export type PersistedStripePaymentObjectInput = {
  organizationId: string;
  connectorId: string;
  mode: "TEST";
  paymentIntentId?: string;
  chargeId?: string;
  amountMinor: number;
  amountRefundedMinor: number;
  currency: string;
  status: string;
  livemode: false;
  safeSnapshot: JsonObject;
};

export type PersistedActionRequestInput = {
  organizationId: string;
  agentId: string;
  connectorId: string | null;
  policyId: string | null;
  operation: string;
  resource: JsonObject;
  parameters: JsonObject;
  context: JsonObject;
  requestPayload: JsonObject;
  decision: StoredAuthRailDecision;
  status: StoredActionRequestStatus;
  decisionReason: string;
  auditEvents: PersistedAuditEventInput[];
  stripePaymentObject?: PersistedStripePaymentObjectInput;
};

export type ActionRequestPersistence = {
  findActiveAgentApiKeyByPrefix: (
    keyPrefix: string,
  ) => Promise<StoredAgentApiKey | null>;
  findActiveConnectorByOrganizationAndType: (input: {
    organizationId: string;
    connectorType: string;
  }) => Promise<StoredConnector | null>;
  listActivePoliciesForOrganization: (
    organizationId: string,
  ) => Promise<StoredPolicy[]>;
  createActionRequestWithAudit: (
    input: PersistedActionRequestInput,
  ) => Promise<{ id: string }>;
};

export type HandleActionRequestInput = {
  authorizationHeader: string | null;
  body: unknown;
  persistence: ActionRequestPersistence;
  approvalUrlBasePath?: string;
  stripePaymentReflector?: StripePaymentReflector;
};

export type HandleActionRequestResponse = {
  status: number;
  body: JsonObject;
};

export type StripePaymentReflector = (
  input: Pick<
    ReflectStripeTestPaymentObjectInput,
    "target" | "requestedAmountMinor"
  >,
) => Promise<ReflectedStripePaymentObject>;

const invalidPayloadResponse = {
  error: "invalid_payload",
  message: "Request body is invalid.",
} satisfies JsonObject;

const missingAuthorizationResponse = {
  error: "unauthorized",
  message: "Authorization bearer token is required.",
} satisfies JsonObject;

const invalidApiKeyResponse = {
  error: "unauthorized",
  message: "API key is invalid.",
} satisfies JsonObject;

const jsonObjectSchema = z.record(z.string(), z.json()).transform((value) => {
  return value as JsonObject;
});

const actionRequestResourceSchema = z.union([
  jsonObjectSchema,
  z.string().trim().min(1),
]);

const actionRequestBodySchema = z
  .object({
    connector: z.string().trim().min(1),
    action: z.string().trim().min(1),
    resource: actionRequestResourceSchema,
    parameters: jsonObjectSchema.default({}),
    context: jsonObjectSchema.default({}),
  })
  .strict();

const policyRulesSchema = z
  .object({
    connector: z.string().min(1).optional(),
    action: z.string().min(1).optional(),
    agent_id: z.string().min(1).optional(),
    amount_gte: z.number().finite().optional(),
    amount_gt: z.number().finite().optional(),
    amount_lte: z.number().finite().optional(),
    amount_lt: z.number().finite().optional(),
  })
  .strict();

type RawActionRequestBody = z.infer<typeof actionRequestBodySchema>;

type ActionRequestBody = Omit<RawActionRequestBody, "resource"> & {
  resource: JsonObject;
};

type PreparedActionRequestBody = {
  body: ActionRequestBody;
  stripePaymentObject?: PersistedStripePaymentObjectInput;
  reflectedStripePayment?: ReflectedStripePaymentObject;
};

type StripeRefundProposalInput = {
  resourceType: "stripe.payment_intent" | "stripe.charge";
  target: StripePaymentTarget;
  requestedAmountMinor: number;
  reason?: string;
};

const policyDecisionByStoredDecision: Record<
  StoredAuthRailDecision,
  PolicyDecision
> = {
  ALLOW: "allow",
  DENY: "deny",
  APPROVAL_REQUIRED: "approval_required",
};

const storedDecisionByPolicyDecision: Record<
  PolicyDecision,
  StoredAuthRailDecision
> = {
  allow: "ALLOW",
  deny: "DENY",
  approval_required: "APPROVAL_REQUIRED",
};

const statusByPolicyDecision: Record<
  PolicyDecision,
  StoredActionRequestStatus
> = {
  allow: "ALLOWED",
  deny: "DENIED",
  approval_required: "APPROVAL_REQUIRED",
};

export async function handleActionRequest({
  authorizationHeader,
  body,
  persistence,
  approvalUrlBasePath = "/approvals",
  stripePaymentReflector,
}: HandleActionRequestInput): Promise<HandleActionRequestResponse> {
  const parsedBody = actionRequestBodySchema.safeParse(body);

  if (!parsedBody.success) {
    return {
      status: 400,
      body: invalidPayloadResponse,
    };
  }

  const apiKey = parseBearerApiKey(authorizationHeader);

  if (!apiKey) {
    return {
      status: 401,
      body: missingAuthorizationResponse,
    };
  }

  let storedApiKey: StoredAgentApiKey | null;

  try {
    storedApiKey = await persistence.findActiveAgentApiKeyByPrefix(
      extractApiKeyPrefix(apiKey),
    );
  } catch {
    return failedClosedResponse("API key validation failed.");
  }

  if (
    !storedApiKey ||
    storedApiKey.agentStatus !== "ACTIVE" ||
    !verifyApiKey(apiKey, storedApiKey.keyHash)
  ) {
    return {
      status: 401,
      body: invalidApiKeyResponse,
    };
  }

  let storedPolicies: StoredPolicy[];

  try {
    storedPolicies = await persistence.listActivePoliciesForOrganization(
      storedApiKey.organizationId,
    );
  } catch {
    return failedClosedResponse("Policy loading failed.");
  }

  const preparedBody = await prepareActionRequestBody({
    body: parsedBody.data,
    storedApiKey,
    persistence,
    stripePaymentReflector,
  });

  if ("response" in preparedBody) {
    return preparedBody.response;
  }

  const evaluation = evaluateActionRequest(
    preparedBody.body,
    storedApiKey,
    storedPolicies,
  );
  const winningStoredPolicy = evaluation.winningPolicy
    ? storedPolicies.find((policy) => {
        return policy.id === evaluation.winningPolicy?.id;
      })
    : undefined;
  const status = statusByPolicyDecision[evaluation.decision];
  const decision = storedDecisionByPolicyDecision[evaluation.decision];
  const persistenceInput = buildPersistenceInput({
    body: preparedBody.body,
    storedApiKey,
    evaluation,
    decision,
    status,
    winningStoredPolicy,
    stripePaymentObject: preparedBody.stripePaymentObject,
    reflectedStripePayment: preparedBody.reflectedStripePayment,
  });

  let actionRequest: { id: string };

  try {
    actionRequest =
      await persistence.createActionRequestWithAudit(persistenceInput);
  } catch {
    return failedClosedResponse("Action request persistence failed.");
  }

  const responseBody: JsonObject = {
    decision: evaluation.decision,
    action_request_id: actionRequest.id,
    reason: evaluation.reason,
  };

  if (evaluation.decision === "approval_required") {
    responseBody.approval_url = `${approvalUrlBasePath}/${actionRequest.id}`;
  }

  return {
    status: 201,
    body: responseBody,
  };
}

async function prepareActionRequestBody({
  body,
  storedApiKey,
  persistence,
  stripePaymentReflector,
}: {
  body: RawActionRequestBody;
  storedApiKey: StoredAgentApiKey;
  persistence: ActionRequestPersistence;
  stripePaymentReflector: StripePaymentReflector | undefined;
}): Promise<
  | PreparedActionRequestBody
  | {
      response: HandleActionRequestResponse;
    }
> {
  const stripeProposal = parseStripeRefundProposalInput(body);

  if (!stripeProposal.shouldReflect) {
    if (typeof body.resource === "string") {
      return {
        response: invalidStripePayloadResponse("Request body is invalid."),
      };
    }

    return {
      body: {
        ...body,
        resource: body.resource,
      },
    };
  }

  if (!stripeProposal.valid) {
    return {
      response: invalidStripePayloadResponse(stripeProposal.message),
    };
  }

  if (!stripePaymentReflector) {
    return {
      response: failedClosedResponse(
        "Stripe payment reflection is not configured.",
      ),
    };
  }

  let connector: StoredConnector | null;

  try {
    connector = await persistence.findActiveConnectorByOrganizationAndType({
      organizationId: storedApiKey.organizationId,
      connectorType: body.connector,
    });
  } catch {
    return {
      response: failedClosedResponse("Stripe connector lookup failed."),
    };
  }

  if (
    !connector ||
    connector.organizationId !== storedApiKey.organizationId ||
    connector.status !== "ACTIVE"
  ) {
    return {
      response: failedClosedResponse(
        "Stripe connector is not configured for this organization.",
      ),
    };
  }

  let reflectedStripePayment: ReflectedStripePaymentObject;

  try {
    reflectedStripePayment = await stripePaymentReflector({
      target: stripeProposal.input.target,
      requestedAmountMinor: stripeProposal.input.requestedAmountMinor,
    });
  } catch (error) {
    return {
      response: failedClosedResponse(getSafeErrorMessage(error)),
    };
  }

  const preparedBody = buildStripeReflectedActionRequestBody({
    body,
    stripeProposal: stripeProposal.input,
    reflectedStripePayment,
  });

  return {
    body: preparedBody,
    reflectedStripePayment,
    stripePaymentObject: {
      organizationId: storedApiKey.organizationId,
      connectorId: connector.id,
      mode: "TEST",
      paymentIntentId: reflectedStripePayment.paymentIntentId,
      chargeId: reflectedStripePayment.chargeId,
      amountMinor: reflectedStripePayment.amountMinor,
      amountRefundedMinor: reflectedStripePayment.amountRefundedMinor,
      currency: reflectedStripePayment.currency,
      status: reflectedStripePayment.status,
      livemode: false,
      safeSnapshot: reflectedStripePayment.safeSnapshot as JsonObject,
    },
  };
}

function evaluateActionRequest(
  body: ActionRequestBody,
  storedApiKey: StoredAgentApiKey,
  storedPolicies: StoredPolicy[],
): PolicyEvaluationResult {
  const activePolicies = storedPolicies.filter((policy) => {
    return policy.status === "ACTIVE";
  });

  try {
    return evaluatePolicies(
      {
        connector: body.connector,
        action: body.action,
        agent_id: storedApiKey.agentId,
        parameters: body.parameters,
      },
      activePolicies.map(toEvaluatorPolicy),
    );
  } catch {
    return {
      decision: "deny",
      reason: "failed closed: policy rules are invalid",
      matchedPolicies: [],
    };
  }
}

function parseStripeRefundProposalInput(
  body: RawActionRequestBody,
):
  | {
      shouldReflect: false;
    }
  | {
      shouldReflect: true;
      valid: false;
      message: string;
    }
  | {
      shouldReflect: true;
      valid: true;
      input: StripeRefundProposalInput;
    } {
  const hasStripeRefundShape =
    body.connector === "stripe_test" &&
    body.action === "refund.create" &&
    (typeof body.resource === "string" ||
      hasStringValue(body.parameters["payment_intent_id"]) ||
      hasStringValue(body.parameters["charge_id"]) ||
      body.parameters["amount_minor"] !== undefined);

  if (!hasStripeRefundShape) {
    return {
      shouldReflect: false,
    };
  }

  const paymentIntentId = getOptionalString(body.parameters["payment_intent_id"]);
  const chargeId = getOptionalString(body.parameters["charge_id"]);

  if (paymentIntentId && chargeId) {
    return {
      shouldReflect: true,
      valid: false,
      message:
        "Stripe refund proposals must include only one payment_intent_id or charge_id.",
    };
  }

  if (!paymentIntentId && !chargeId) {
    return {
      shouldReflect: true,
      valid: false,
      message: "Stripe refund proposals require payment_intent_id or charge_id.",
    };
  }

  const requestedAmountMinor = body.parameters["amount_minor"];

  if (
    typeof requestedAmountMinor !== "number" ||
    !Number.isSafeInteger(requestedAmountMinor) ||
    requestedAmountMinor <= 0
  ) {
    return {
      shouldReflect: true,
      valid: false,
      message:
        "Stripe refund proposals require a positive integer amount_minor.",
    };
  }

  const resourceTypeResult = getStripeResourceType({
    resource: body.resource,
    paymentIntentId,
    chargeId,
  });

  if (!resourceTypeResult.valid) {
    return {
      shouldReflect: true,
      valid: false,
      message: resourceTypeResult.message,
    };
  }

  return {
    shouldReflect: true,
    valid: true,
    input: {
      resourceType: resourceTypeResult.resourceType,
      target: {
        ...(paymentIntentId ? { paymentIntentId } : {}),
        ...(chargeId ? { chargeId } : {}),
      },
      requestedAmountMinor,
      reason: getOptionalString(body.parameters["reason"]),
    },
  };
}

function buildStripeReflectedActionRequestBody({
  body,
  stripeProposal,
  reflectedStripePayment,
}: {
  body: RawActionRequestBody;
  stripeProposal: StripeRefundProposalInput;
  reflectedStripePayment: ReflectedStripePaymentObject;
}): ActionRequestBody {
  const paymentIntentId = reflectedStripePayment.paymentIntentId;
  const chargeId = reflectedStripePayment.chargeId;

  return {
    connector: body.connector,
    action: body.action,
    resource: withDefinedValues({
      type: stripeProposal.resourceType,
      payment_intent_id: paymentIntentId,
      charge_id: chargeId,
      livemode: false,
    }),
    parameters: withDefinedValues({
      amount: reflectedStripePayment.requestedAmountMinor / 100,
      amount_minor: reflectedStripePayment.requestedAmountMinor,
      currency: reflectedStripePayment.currency,
      payment_intent_id: paymentIntentId,
      charge_id: chargeId,
      refundable_amount_minor: reflectedStripePayment.refundableAmountMinor,
      reason: stripeProposal.reason,
    }),
    context: {
      ...body.context,
      stripe_reflection: {
        payment_object_reflected: true,
        livemode: false,
        status: reflectedStripePayment.status,
      },
    },
  };
}

function toEvaluatorPolicy(policy: StoredPolicy): Policy {
  return {
    id: policy.id,
    name: policy.name,
    priority: policy.priority,
    decision: policyDecisionByStoredDecision[policy.decision],
    rules: policyRulesSchema.parse(policy.rules) satisfies PolicyRules,
  };
}

function buildPersistenceInput({
  body,
  storedApiKey,
  evaluation,
  decision,
  status,
  winningStoredPolicy,
  stripePaymentObject,
  reflectedStripePayment,
}: {
  body: ActionRequestBody;
  storedApiKey: StoredAgentApiKey;
  evaluation: PolicyEvaluationResult;
  decision: StoredAuthRailDecision;
  status: StoredActionRequestStatus;
  winningStoredPolicy: StoredPolicy | undefined;
  stripePaymentObject: PersistedStripePaymentObjectInput | undefined;
  reflectedStripePayment: ReflectedStripePaymentObject | undefined;
}): PersistedActionRequestInput {
  const requestPayload: JsonObject = {
    connector: body.connector,
    action: body.action,
    resource: body.resource,
    parameters: body.parameters,
    context: body.context,
  };
  const metadataBase = {
    connector: body.connector,
    action: body.action,
    decision: evaluation.decision,
  } satisfies JsonObject;

  return {
    organizationId: storedApiKey.organizationId,
    agentId: storedApiKey.agentId,
    connectorId: stripePaymentObject?.connectorId ?? winningStoredPolicy?.connectorId ?? null,
    policyId: winningStoredPolicy?.id ?? null,
    operation: body.action,
    resource: body.resource,
    parameters: body.parameters,
    context: body.context,
    requestPayload,
    decision,
    status,
    decisionReason: evaluation.reason,
    stripePaymentObject,
    auditEvents: [
      ...buildStripeReflectionAuditEvents({
        storedApiKey,
        body,
        reflectedStripePayment,
      }),
      {
        type: "REQUEST_RECEIVED",
        actorType: "AGENT",
        agentId: storedApiKey.agentId,
        metadata: {
          ...metadataBase,
          event: "request_received",
          api_key_id: storedApiKey.id,
        },
      },
      {
        type: "POLICY_EVALUATED",
        actorType: "AGENT",
        agentId: storedApiKey.agentId,
        metadata: {
          ...metadataBase,
          event: "policy_evaluated",
          reason: evaluation.reason,
          matched_policies: evaluation.matchedPolicies.map((policy) => {
            return {
              id: policy.id,
              name: policy.name,
              priority: policy.priority,
              decision: policy.decision,
            };
          }),
        },
      },
      {
        type: "DECISION_CREATED",
        actorType: "AGENT",
        agentId: storedApiKey.agentId,
        metadata: {
          ...metadataBase,
          event: "decision_created",
          status,
          winning_policy_id: winningStoredPolicy?.id ?? null,
        },
      },
      ...buildApprovalRequestedAuditEvents({
        storedApiKey,
        body,
        evaluation,
        status,
        reflectedStripePayment,
      }),
    ],
  };
}

function buildStripeReflectionAuditEvents({
  storedApiKey,
  body,
  reflectedStripePayment,
}: {
  storedApiKey: StoredAgentApiKey;
  body: ActionRequestBody;
  reflectedStripePayment: ReflectedStripePaymentObject | undefined;
}): PersistedAuditEventInput[] {
  if (!reflectedStripePayment) {
    return [];
  }

  return [
    {
      type: "STRIPE_PAYMENT_OBJECT_REFLECTED",
      actorType: "SYSTEM",
      agentId: storedApiKey.agentId,
      metadata: withDefinedValues({
        event: "stripe_payment_object_reflected",
        connector: body.connector,
        action: body.action,
        payment_intent_id: reflectedStripePayment.paymentIntentId,
        charge_id: reflectedStripePayment.chargeId,
        amount_minor: reflectedStripePayment.amountMinor,
        amount_refunded_minor: reflectedStripePayment.amountRefundedMinor,
        refundable_amount_minor: reflectedStripePayment.refundableAmountMinor,
        requested_amount_minor: reflectedStripePayment.requestedAmountMinor,
        currency: reflectedStripePayment.currency,
        status: reflectedStripePayment.status,
        livemode: false,
      }),
    },
  ];
}

function buildApprovalRequestedAuditEvents({
  storedApiKey,
  body,
  evaluation,
  status,
  reflectedStripePayment,
}: {
  storedApiKey: StoredAgentApiKey;
  body: ActionRequestBody;
  evaluation: PolicyEvaluationResult;
  status: StoredActionRequestStatus;
  reflectedStripePayment: ReflectedStripePaymentObject | undefined;
}): PersistedAuditEventInput[] {
  if (!reflectedStripePayment || status !== "APPROVAL_REQUIRED") {
    return [];
  }

  return [
    {
      type: "APPROVAL_REQUESTED",
      actorType: "SYSTEM",
      agentId: storedApiKey.agentId,
      metadata: withDefinedValues({
        event: "approval_requested",
        connector: body.connector,
        action: body.action,
        decision: evaluation.decision,
        reason: evaluation.reason,
        payment_intent_id: reflectedStripePayment.paymentIntentId,
        charge_id: reflectedStripePayment.chargeId,
        requested_amount_minor: reflectedStripePayment.requestedAmountMinor,
        currency: reflectedStripePayment.currency,
      }),
    },
  ];
}

function parseBearerApiKey(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token, ...extra] = authorizationHeader.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer" || !token || extra.length > 0) {
    return null;
  }

  return token;
}

function extractApiKeyPrefix(apiKey: string): string {
  const separatorIndex = apiKey.lastIndexOf("_");

  if (separatorIndex <= 0) {
    return apiKey;
  }

  return apiKey.slice(0, separatorIndex);
}

function getStripeResourceType({
  resource,
  paymentIntentId,
  chargeId,
}: {
  resource: RawActionRequestBody["resource"];
  paymentIntentId: string | undefined;
  chargeId: string | undefined;
}):
  | {
      valid: true;
      resourceType: "stripe.payment_intent" | "stripe.charge";
    }
  | {
      valid: false;
      message: string;
    } {
  if (typeof resource !== "string") {
    return {
      valid: true,
      resourceType: paymentIntentId ? "stripe.payment_intent" : "stripe.charge",
    };
  }

  if (resource !== "stripe.payment_intent" && resource !== "stripe.charge") {
    return {
      valid: false,
      message:
        "Stripe refund proposals require resource stripe.payment_intent or stripe.charge.",
    };
  }

  if (resource === "stripe.payment_intent" && !paymentIntentId) {
    return {
      valid: false,
      message:
        "Stripe payment_intent refund proposals require payment_intent_id.",
    };
  }

  if (resource === "stripe.charge" && !chargeId) {
    return {
      valid: false,
      message: "Stripe charge refund proposals require charge_id.",
    };
  }

  return {
    valid: true,
    resourceType: resource,
  };
}

function getOptionalString(value: JsonValue | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function hasStringValue(value: JsonValue | undefined): boolean {
  return getOptionalString(value) !== undefined;
}

function invalidStripePayloadResponse(
  message: string,
): HandleActionRequestResponse {
  return {
    status: 400,
    body: {
      error: "invalid_payload",
      message,
    },
  };
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return redactStripeSecretsInMessage(error.message);
  }

  return "Stripe payment reflection failed.";
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

function failedClosedResponse(reason: string): HandleActionRequestResponse {
  return {
    status: 500,
    body: {
      decision: "deny",
      reason: `failed closed: ${reason}`,
    },
  };
}
