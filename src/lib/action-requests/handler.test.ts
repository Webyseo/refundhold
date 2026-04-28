import { describe, expect, it, vi } from "vitest";

import { generateDemoApiKey, hashApiKey } from "../security/api-keys";

import {
  handleActionRequest,
  type ActionRequestPersistence,
  type PersistedActionRequestInput,
  type StripePaymentReflector,
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
    currency: "USD",
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
          name: "Allow refunds under 50 USD",
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
      reason: "allow policy matched: Allow refunds under 50 USD",
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
          name: "Deny refunds over 500 USD",
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
          currency: "USD",
        },
      },
      persistence,
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      decision: "deny",
      action_request_id: "ar_123",
      reason: "deny policy matched: Deny refunds over 500 USD",
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
          name: "Review refunds from 50 USD to 500 USD",
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
          currency: "USD",
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
        "approval_required policy matched: Review refunds from 50 USD to 500 USD",
      approval_url: "/approvals/ar_123",
    });
    expect(getPersistedInput(persistence).status).toBe("APPROVAL_REQUIRED");
  });

  it("keeps existing dry_run requests working without Stripe reflection", async () => {
    const apiKey = generateDemoApiKey();
    const stripePaymentReflector = vi.fn<StripePaymentReflector>();
    const persistence = createPersistence({
      apiKey: {
        ...defaultStoredApiKey,
        keyPrefix: apiKey.prefix,
        keyHash: hashApiKey(apiKey.key),
      },
      policies: [
        createPolicy({
          id: "policy_allow",
          name: "Allow refunds under 50 USD",
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
      stripePaymentReflector,
    });

    expect(response.status).toBe(201);
    expect(response.body.decision).toBe("allow");
    expect(stripePaymentReflector).not.toHaveBeenCalled();
  });

  it("rejects a Stripe reflection request without a payment target", async () => {
    const apiKey = generateDemoApiKey();
    const persistence = createPersistence({
      apiKey: {
        ...defaultStoredApiKey,
        keyPrefix: apiKey.prefix,
        keyHash: hashApiKey(apiKey.key),
      },
    });

    const response = await handleActionRequest({
      authorizationHeader: `Bearer ${apiKey.key}`,
      body: createStripeReflectionBody({
        parameters: {
          amount_minor: 1000,
        },
      }),
      persistence,
      stripePaymentReflector: vi.fn<StripePaymentReflector>(),
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "invalid_payload",
      message: "Stripe refund proposals require payment_intent_id or charge_id.",
    });
    expect(persistence.createActionRequestWithAudit).not.toHaveBeenCalled();
  });

  it("rejects a Stripe reflection request with both payment targets", async () => {
    const apiKey = generateDemoApiKey();
    const persistence = createPersistence({
      apiKey: {
        ...defaultStoredApiKey,
        keyPrefix: apiKey.prefix,
        keyHash: hashApiKey(apiKey.key),
      },
    });

    const response = await handleActionRequest({
      authorizationHeader: `Bearer ${apiKey.key}`,
      body: createStripeReflectionBody({
        parameters: {
          payment_intent_id: "pi_test",
          charge_id: "ch_test",
          amount_minor: 1000,
        },
      }),
      persistence,
      stripePaymentReflector: vi.fn<StripePaymentReflector>(),
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "invalid_payload",
      message:
        "Stripe refund proposals must include only one payment_intent_id or charge_id.",
    });
  });

  it("rejects a Stripe reflection request without amount_minor", async () => {
    const apiKey = generateDemoApiKey();
    const persistence = createPersistence({
      apiKey: {
        ...defaultStoredApiKey,
        keyPrefix: apiKey.prefix,
        keyHash: hashApiKey(apiKey.key),
      },
    });

    const response = await handleActionRequest({
      authorizationHeader: `Bearer ${apiKey.key}`,
      body: createStripeReflectionBody({
        parameters: {
          payment_intent_id: "pi_test",
        },
      }),
      persistence,
      stripePaymentReflector: vi.fn<StripePaymentReflector>(),
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "invalid_payload",
      message:
        "Stripe refund proposals require a positive integer amount_minor.",
    });
  });

  it("fails closed when Stripe reflection is disabled", async () => {
    const apiKey = generateDemoApiKey();
    const persistence = createPersistence({
      apiKey: {
        ...defaultStoredApiKey,
        keyPrefix: apiKey.prefix,
        keyHash: hashApiKey(apiKey.key),
      },
    });

    const response = await handleActionRequest({
      authorizationHeader: `Bearer ${apiKey.key}`,
      body: createStripeReflectionBody(),
      persistence,
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      decision: "deny",
      reason: "failed closed: Stripe payment reflection is not configured.",
    });
  });

  it("creates an action request from a reflected PaymentIntent test object", async () => {
    const apiKey = generateDemoApiKey();
    const persistence = createPersistence({
      apiKey: {
        ...defaultStoredApiKey,
        keyPrefix: apiKey.prefix,
        keyHash: hashApiKey(apiKey.key),
      },
      connector: defaultConnector,
      policies: [
        createPolicy({
          id: "policy_review",
          name: "Review refunds from 50 USD to 500 USD",
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
    const stripePaymentReflector = vi.fn<StripePaymentReflector>(async () => {
      return reflectedPaymentObject;
    });

    const response = await handleActionRequest({
      authorizationHeader: `Bearer ${apiKey.key}`,
      body: createStripeReflectionBody({
        parameters: {
          payment_intent_id: "pi_test",
          amount_minor: 10000,
          reason: "requested_by_customer",
        },
      }),
      persistence,
      stripePaymentReflector,
      approvalUrlBasePath: "/approvals",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      decision: "approval_required",
      action_request_id: "ar_123",
      reason:
        "approval_required policy matched: Review refunds from 50 USD to 500 USD",
      approval_url: "/approvals/ar_123",
    });
    expect(stripePaymentReflector).toHaveBeenCalledWith({
      target: {
        paymentIntentId: "pi_test",
      },
      requestedAmountMinor: 10000,
    });

    const persistedInput = getPersistedInput(persistence);
    expect(persistedInput.connectorId).toBe("conn_123");
    expect(persistedInput.parameters).toEqual({
      amount: 100,
      amount_minor: 10000,
      currency: "usd",
      payment_intent_id: "pi_test",
      charge_id: "ch_test",
      refundable_amount_minor: 15000,
      reason: "requested_by_customer",
    });
    expect(persistedInput.resource).toEqual({
      type: "stripe.payment_intent",
      payment_intent_id: "pi_test",
      charge_id: "ch_test",
      livemode: false,
    });
    expect(persistedInput.stripePaymentObject).toEqual({
      organizationId: "org_123",
      connectorId: "conn_123",
      mode: "TEST",
      paymentIntentId: "pi_test",
      chargeId: "ch_test",
      amountMinor: 20000,
      amountRefundedMinor: 5000,
      currency: "usd",
      status: "succeeded",
      livemode: false,
      safeSnapshot: reflectedPaymentObject.safeSnapshot,
    });
    expect(persistedInput).not.toHaveProperty("stripeRefund");
    expect(persistedInput).not.toHaveProperty("execution");
    expect(persistedInput.auditEvents.map((event) => event.type)).toEqual([
      "STRIPE_PAYMENT_OBJECT_REFLECTED",
      "REQUEST_RECEIVED",
      "POLICY_EVALUATED",
      "DECISION_CREATED",
      "APPROVAL_REQUESTED",
    ]);
  });

  it("creates an action request from a reflected Charge test object", async () => {
    const apiKey = generateDemoApiKey();
    const persistence = createPersistence({
      apiKey: {
        ...defaultStoredApiKey,
        keyPrefix: apiKey.prefix,
        keyHash: hashApiKey(apiKey.key),
      },
      connector: defaultConnector,
      policies: [
        createPolicy({
          id: "policy_allow",
          name: "Allow refunds under 50 USD",
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
      body: createStripeReflectionBody({
        resource: "stripe.charge",
        parameters: {
          charge_id: "ch_test",
          amount_minor: 2500,
        },
      }),
      persistence,
      stripePaymentReflector: vi.fn<StripePaymentReflector>(async () => {
        return {
          ...reflectedPaymentObject,
          requestedAmountMinor: 2500,
        };
      }),
    });

    expect(response.status).toBe(201);
    expect(response.body.decision).toBe("allow");
    expect(getPersistedInput(persistence).resource).toEqual({
      type: "stripe.charge",
      payment_intent_id: "pi_test",
      charge_id: "ch_test",
      livemode: false,
    });
  });

  it("fails closed when the requested amount exceeds the reflected refundable amount", async () => {
    const apiKey = generateDemoApiKey();
    const persistence = createPersistence({
      apiKey: {
        ...defaultStoredApiKey,
        keyPrefix: apiKey.prefix,
        keyHash: hashApiKey(apiKey.key),
      },
      connector: defaultConnector,
    });

    const response = await handleActionRequest({
      authorizationHeader: `Bearer ${apiKey.key}`,
      body: createStripeReflectionBody(),
      persistence,
      stripePaymentReflector: vi.fn<StripePaymentReflector>(async () => {
        throw new Error(
          "Requested refund amount exceeds the refundable Stripe amount.",
        );
      }),
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      decision: "deny",
      reason:
        "failed closed: Requested refund amount exceeds the refundable Stripe amount.",
    });
    expect(persistence.createActionRequestWithAudit).not.toHaveBeenCalled();
  });

  it("redacts Stripe keys from reflection failures", async () => {
    const apiKey = generateDemoApiKey();
    const stripeKey = `sk_test_${"a".repeat(24)}`;
    const persistence = createPersistence({
      apiKey: {
        ...defaultStoredApiKey,
        keyPrefix: apiKey.prefix,
        keyHash: hashApiKey(apiKey.key),
      },
      connector: defaultConnector,
    });

    const response = await handleActionRequest({
      authorizationHeader: `Bearer ${apiKey.key}`,
      body: createStripeReflectionBody(),
      persistence,
      stripePaymentReflector: vi.fn<StripePaymentReflector>(async () => {
        throw new Error(`Stripe rejected key ${stripeKey}`);
      }),
    });

    expect(response.status).toBe(500);
    expect(response.body.reason).toBe(
      "failed closed: Stripe rejected key sk_test_***",
    );
    expect(JSON.stringify(response.body)).not.toContain(stripeKey);
    expect(persistence.createActionRequestWithAudit).not.toHaveBeenCalled();
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

const defaultConnector = {
  id: "conn_123",
  organizationId: "org_123",
  type: "stripe_test",
  status: "ACTIVE" as const,
};

const reflectedPaymentObject = {
  paymentIntentId: "pi_test",
  chargeId: "ch_test",
  amountMinor: 20000,
  amountRefundedMinor: 5000,
  refundableAmountMinor: 15000,
  requestedAmountMinor: 10000,
  currency: "usd",
  status: "succeeded",
  livemode: false as const,
  safeSnapshot: {
    paymentIntentId: "pi_test",
    chargeId: "ch_test",
    amountMinor: 20000,
    amountRefundedMinor: 5000,
    currency: "usd",
    status: "succeeded",
    livemode: false as const,
    created: 1_776_000_000,
  },
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
  connector = null,
  policies = [],
}: {
  apiKey?: StoredAgentApiKey | null;
  connector?: typeof defaultConnector | null;
  policies?: StoredPolicy[];
} = {}): ActionRequestPersistence {
  return {
    findActiveAgentApiKeyByPrefix: vi.fn(async () => apiKey),
    findActiveConnectorByOrganizationAndType: vi.fn(async () => connector),
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

function createStripeReflectionBody({
  resource = "stripe.payment_intent",
  parameters = {
    payment_intent_id: "pi_test",
    amount_minor: 10000,
  },
}: {
  resource?: string;
  parameters?: Record<string, unknown>;
} = {}) {
  return {
    connector: "stripe_test",
    action: "refund.create",
    resource,
    parameters,
    context: {
      customer_email: "demo@example.com",
      order_id: "order_demo_123",
      ai_agent_reason: "Customer requested a refund after failed onboarding",
    },
  };
}
