import { describe, expect, it, vi } from "vitest";

import { generateDemoApiKey, hashApiKey } from "../security/api-keys";

import {
  handleActionRequest,
  type ActionRequestPersistence,
  type PersistedActionRequestInput,
  type StoredAgentApiKey,
  type StoredPolicy,
} from "./handler";

const validBody = {
  connector: "stripe_test",
  action: "refund.create",
  resource: {
    refund_id: "re_demo",
  },
  parameters: {
    amount: 25,
    currency: "EUR",
  },
  context: {
    reason: "customer_request",
  },
};

describe("handleActionRequest", () => {
  it("rejects an invalid payload", async () => {
    const persistence = createPersistence();

    const response = await handleActionRequest({
      authorizationHeader: `Bearer ${generateDemoApiKey().key}`,
      body: {
        connector: "stripe_test",
      },
      persistence,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "invalid_payload",
      message: "Request body is invalid.",
    });
    expect(persistence.findActiveAgentApiKeyByPrefix).not.toHaveBeenCalled();
  });

  it("rejects a missing Authorization header", async () => {
    const persistence = createPersistence();

    const response = await handleActionRequest({
      authorizationHeader: null,
      body: validBody,
      persistence,
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "unauthorized",
      message: "Authorization bearer token is required.",
    });
    expect(persistence.findActiveAgentApiKeyByPrefix).not.toHaveBeenCalled();
  });

  it("rejects an invalid API key", async () => {
    const validApiKey = generateDemoApiKey();
    const invalidApiKey = generateDemoApiKey();
    const persistence = createPersistence({
      apiKey: {
        ...defaultStoredApiKey,
        keyHash: hashApiKey(validApiKey.key),
      },
    });

    const response = await handleActionRequest({
      authorizationHeader: `Bearer ${invalidApiKey.key}`,
      body: validBody,
      persistence,
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "unauthorized",
      message: "API key is invalid.",
    });
  });

  it("returns allow for a valid request matching an allow policy", async () => {
    const apiKey = generateDemoApiKey();
    const persistence = createPersistence({
      apiKey: {
        ...defaultStoredApiKey,
        keyPrefix: apiKey.prefix,
        keyHash: hashApiKey(apiKey.key),
      },
      policies: [
        createPolicy({
          id: "policy_allow",
          name: "Allow refunds under 50 EUR",
          decision: "ALLOW",
          priority: 10,
          rules: {
            connector: "stripe_test",
            action: "refund.create",
            amount_lt: 50,
          },
        }),
      ],
    });

    const response = await handleActionRequest({
      authorizationHeader: `Bearer ${apiKey.key}`,
      body: validBody,
      persistence,
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      decision: "allow",
      action_request_id: "ar_123",
      reason: "allow policy matched: Allow refunds under 50 EUR",
    });
    expect(persistence.createActionRequestWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_123",
        agentId: "agent_123",
        connectorId: "conn_123",
        policyId: "policy_allow",
        operation: "refund.create",
        decision: "ALLOW",
        status: "ALLOWED",
      }),
    );
    expect(getPersistedInput(persistence).auditEvents.map((event) => {
      return event.type;
    })).toEqual(["REQUEST_RECEIVED", "POLICY_EVALUATED", "DECISION_CREATED"]);
    expect(getPersistedInput(persistence).auditEvents.map((event) => {
      return event.metadata.event;
    })).toEqual(["request_received", "policy_evaluated", "decision_created"]);
  });

  it("returns deny for a valid request matching a deny policy", async () => {
    const apiKey = generateDemoApiKey();
    const persistence = createPersistence({
      apiKey: {
        ...defaultStoredApiKey,
        keyPrefix: apiKey.prefix,
        keyHash: hashApiKey(apiKey.key),
      },
      policies: [
        createPolicy({
          id: "policy_deny",
          name: "Deny refunds over 500 EUR",
          decision: "DENY",
          priority: 10,
          rules: {
            connector: "stripe_test",
            action: "refund.create",
            amount_gt: 500,
          },
        }),
      ],
    });

    const response = await handleActionRequest({
      authorizationHeader: `Bearer ${apiKey.key}`,
      body: {
        ...validBody,
        parameters: {
          amount: 750,
          currency: "EUR",
        },
      },
      persistence,
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      decision: "deny",
      action_request_id: "ar_123",
      reason: "deny policy matched: Deny refunds over 500 EUR",
    });
    expect(getPersistedInput(persistence).status).toBe("DENIED");
  });

  it("returns approval_required with approval_url for a valid request matching an approval policy", async () => {
    const apiKey = generateDemoApiKey();
    const persistence = createPersistence({
      apiKey: {
        ...defaultStoredApiKey,
        keyPrefix: apiKey.prefix,
        keyHash: hashApiKey(apiKey.key),
      },
      policies: [
        createPolicy({
          id: "policy_review",
          name: "Review refunds from 50 EUR to 500 EUR",
          decision: "APPROVAL_REQUIRED",
          priority: 10,
          rules: {
            connector: "stripe_test",
            action: "refund.create",
            amount_gte: 50,
            amount_lte: 500,
          },
        }),
      ],
    });

    const response = await handleActionRequest({
      authorizationHeader: `Bearer ${apiKey.key}`,
      body: {
        ...validBody,
        parameters: {
          amount: 100,
          currency: "EUR",
        },
      },
      persistence,
      approvalUrlBasePath: "/approvals",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      decision: "approval_required",
      action_request_id: "ar_123",
      reason:
        "approval_required policy matched: Review refunds from 50 EUR to 500 EUR",
      approval_url: "/approvals/ar_123",
    });
    expect(getPersistedInput(persistence).status).toBe("APPROVAL_REQUIRED");
  });
});

const defaultStoredApiKey: StoredAgentApiKey = {
  id: "key_123",
  keyPrefix: "ar_demo_prefix",
  keyHash: hashApiKey("ar_demo_prefix_secret"),
  agentId: "agent_123",
  organizationId: "org_123",
  agentStatus: "ACTIVE",
};

function createPolicy(
  policy: Partial<StoredPolicy> & Pick<StoredPolicy, "id" | "name" | "decision" | "rules">,
): StoredPolicy {
  return {
    organizationId: "org_123",
    connectorId: "conn_123",
    priority: 100,
    status: "ACTIVE",
    ...policy,
  };
}

function createPersistence({
  apiKey = defaultStoredApiKey,
  policies = [],
}: {
  apiKey?: StoredAgentApiKey | null;
  policies?: StoredPolicy[];
} = {}): ActionRequestPersistence {
  return {
    findActiveAgentApiKeyByPrefix: vi.fn(async () => apiKey),
    listActivePoliciesForOrganization: vi.fn(async () => policies),
    createActionRequestWithAudit: vi.fn(async () => {
      return {
        id: "ar_123",
      };
    }),
  };
}

function getPersistedInput(
  persistence: ActionRequestPersistence,
): PersistedActionRequestInput {
  const call = vi.mocked(persistence.createActionRequestWithAudit).mock
    .calls[0];

  if (!call) {
    throw new Error("Expected createActionRequestWithAudit to be called.");
  }

  return call[0];
}
