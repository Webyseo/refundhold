import { z } from "zod";

import {
  evaluatePolicies,
  type Policy,
  type PolicyDecision,
  type PolicyEvaluationResult,
  type PolicyRules,
} from "../policies/evaluator";
import { verifyApiKey } from "../security/api-keys";

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

export type PersistedAuditEventInput = {
  type: "REQUEST_RECEIVED" | "POLICY_EVALUATED" | "DECISION_CREATED";
  actorType: "AGENT";
  agentId: string;
  metadata: JsonObject;
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
};

export type ActionRequestPersistence = {
  findActiveAgentApiKeyByPrefix: (
    keyPrefix: string,
  ) => Promise<StoredAgentApiKey | null>;
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
};

export type HandleActionRequestResponse = {
  status: number;
  body: JsonObject;
};

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

const actionRequestBodySchema = z
  .object({
    connector: z.string().trim().min(1),
    action: z.string().trim().min(1),
    resource: jsonObjectSchema,
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

type ActionRequestBody = z.infer<typeof actionRequestBodySchema>;

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

  const evaluation = evaluateActionRequest(
    parsedBody.data,
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
    body: parsedBody.data,
    storedApiKey,
    evaluation,
    decision,
    status,
    winningStoredPolicy,
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
}: {
  body: ActionRequestBody;
  storedApiKey: StoredAgentApiKey;
  evaluation: PolicyEvaluationResult;
  decision: StoredAuthRailDecision;
  status: StoredActionRequestStatus;
  winningStoredPolicy: StoredPolicy | undefined;
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
    connectorId: winningStoredPolicy?.connectorId ?? null,
    policyId: winningStoredPolicy?.id ?? null,
    operation: body.action,
    resource: body.resource,
    parameters: body.parameters,
    context: body.context,
    requestPayload,
    decision,
    status,
    decisionReason: evaluation.reason,
    auditEvents: [
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
    ],
  };
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

function failedClosedResponse(reason: string): HandleActionRequestResponse {
  return {
    status: 500,
    body: {
      decision: "deny",
      reason: `failed closed: ${reason}`,
    },
  };
}
