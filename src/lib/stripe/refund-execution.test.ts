import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  executeStripeTestRefundForActionRequest,
  type StripeRefundExecutionClient,
  type StripeTestRefundExecutionPersistence,
  type StoredStripeRefundExecutableActionRequest,
} from "./refund-execution";

const enabledTestRefundEnv = {
  AUTHRAIL_STRIPE_TEST_MODE_ENABLED: "true",
  AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED: "true",
  AUTHRAIL_STRIPE_TEST_SECRET_KEY: "sk_test_unit_fixture",
};

describe("executeStripeTestRefundForActionRequest", () => {
  it("fails closed when Stripe test refunds are disabled", async () => {
    const persistence = createPersistence();

    const response = await executeStripeTestRefundForActionRequest({
      actionRequestId: "ar_stripe",
      persistence,
      stripeClient: createStripeClient(),
      env: {
        AUTHRAIL_STRIPE_TEST_MODE_ENABLED: "true",
        AUTHRAIL_STRIPE_TEST_SECRET_KEY: "sk_test_unit_fixture",
      },
      createExecutionId: () => "execution_123",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "execution_failed",
      message:
        "AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED is required for Stripe test refund execution.",
    });
    expect(persistence.beginStripeTestRefundExecution).not.toHaveBeenCalled();
  });

  it("fails closed when Stripe test mode is disabled", async () => {
    const persistence = createPersistence();

    const response = await executeStripeTestRefundForActionRequest({
      actionRequestId: "ar_stripe",
      persistence,
      stripeClient: createStripeClient(),
      env: {
        AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED: "true",
        AUTHRAIL_STRIPE_TEST_SECRET_KEY: "sk_test_unit_fixture",
      },
      createExecutionId: () => "execution_123",
    });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe(
      "AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED requires AUTHRAIL_STRIPE_TEST_MODE_ENABLED.",
    );
    expect(persistence.beginStripeTestRefundExecution).not.toHaveBeenCalled();
  });

  it("fails closed when live refunds are enabled", async () => {
    const response = await executeStripeTestRefundForActionRequest({
      actionRequestId: "ar_stripe",
      persistence: createPersistence(),
      stripeClient: createStripeClient(),
      env: {
        ...enabledTestRefundEnv,
        AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED: "true",
      },
      createExecutionId: () => "execution_123",
    });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe(
      "AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED is intentionally blocked in v1.",
    );
  });

  it("returns not found when the action request does not exist", async () => {
    const persistence = createPersistence({
      actionRequest: null,
    });

    const response = await executeStripeTestRefundForActionRequest({
      actionRequestId: "missing",
      persistence,
      stripeClient: createStripeClient(),
      env: enabledTestRefundEnv,
      createExecutionId: () => "execution_123",
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "not_found",
      message: "Action request was not found.",
    });
  });

  it("does not execute an unapproved request", async () => {
    const response = await executeStripeTestRefundForActionRequest({
      actionRequestId: "ar_pending",
      persistence: createPersistence({
        actionRequest: {
          ...defaultActionRequest,
          status: "APPROVAL_REQUIRED",
        },
      }),
      stripeClient: createStripeClient(),
      env: enabledTestRefundEnv,
      createExecutionId: () => "execution_123",
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "not_executable",
      message: "Action request must be approved before Stripe execution.",
    });
  });

  it("does not execute rejected or denied requests", async () => {
    const rejected = await executeStripeTestRefundForActionRequest({
      actionRequestId: "ar_rejected",
      persistence: createPersistence({
        actionRequest: {
          ...defaultActionRequest,
          status: "REJECTED",
        },
      }),
      stripeClient: createStripeClient(),
      env: enabledTestRefundEnv,
      createExecutionId: () => "execution_rejected",
    });
    const denied = await executeStripeTestRefundForActionRequest({
      actionRequestId: "ar_denied",
      persistence: createPersistence({
        actionRequest: {
          ...defaultActionRequest,
          decision: "DENY",
          status: "DENIED",
        },
      }),
      stripeClient: createStripeClient(),
      env: enabledTestRefundEnv,
      createExecutionId: () => "execution_denied",
    });

    expect(rejected.status).toBe(409);
    expect(rejected.body.message).toBe(
      "Rejected action requests cannot be executed.",
    );
    expect(denied.status).toBe(409);
    expect(denied.body.message).toBe("Denied action requests cannot be executed.");
  });

  it("does not execute when a StripeRefund already exists", async () => {
    const persistence = createPersistence({
      actionRequest: {
        ...defaultActionRequest,
        existingStripeRefund: {
          id: "stripe_refund_existing",
          stripeRefundId: "re_existing",
          stripeStatus: "succeeded",
        },
      },
    });

    const response = await executeStripeTestRefundForActionRequest({
      actionRequestId: "ar_stripe",
      persistence,
      stripeClient: createStripeClient(),
      env: enabledTestRefundEnv,
      createExecutionId: () => "execution_123",
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "already_executed",
      message: "Stripe refund already exists for this action request.",
    });
    expect(persistence.beginStripeTestRefundExecution).not.toHaveBeenCalled();
  });

  it("does not execute when a completed Execution already exists", async () => {
    const persistence = createPersistence({
      actionRequest: {
        ...defaultActionRequest,
        completedExecution: {
          id: "execution_existing",
          status: "SUCCEEDED",
        },
      },
    });

    const response = await executeStripeTestRefundForActionRequest({
      actionRequestId: "ar_stripe",
      persistence,
      stripeClient: createStripeClient(),
      env: enabledTestRefundEnv,
      createExecutionId: () => "execution_123",
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "already_executed",
      message: "Action request already has a completed execution.",
    });
    expect(persistence.beginStripeTestRefundExecution).not.toHaveBeenCalled();
  });

  it("rejects live mode Stripe payment objects", async () => {
    const response = await executeStripeTestRefundForActionRequest({
      actionRequestId: "ar_stripe",
      persistence: createPersistence({
        actionRequest: {
          ...defaultActionRequest,
          stripePaymentObject: {
            ...defaultStripePaymentObject,
            livemode: true,
          },
        },
      }),
      stripeClient: createStripeClient(),
      env: enabledTestRefundEnv,
      createExecutionId: () => "execution_123",
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "not_executable",
      message: "Stripe payment object is live mode; v1 only executes test mode.",
    });
  });

  it("creates a running execution and pending StripeRefund before calling Stripe", async () => {
    const order: string[] = [];
    const persistence = createPersistence({
      onBegin: () => {
        order.push("begin");
      },
      onSuccess: () => {
        order.push("success");
      },
    });
    const stripeClient = createStripeClient({
      onCreate: () => {
        order.push("stripe");
      },
    });

    await executeStripeTestRefundForActionRequest({
      actionRequestId: "ar_stripe",
      persistence,
      stripeClient,
      env: enabledTestRefundEnv,
      createExecutionId: () => "execution_123",
    });

    expect(order).toEqual(["begin", "stripe", "success"]);
    expect(persistence.beginStripeTestRefundExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        actionRequestId: "ar_stripe",
        executionId: "execution_123",
        executionStatus: "RUNNING",
        stripeRefundStatus: "pending",
        mode: "DIRECT",
        stripeMode: "TEST",
      }),
    );
  });

  it("creates a PaymentIntent refund with idempotency and stores only the hash", async () => {
    const persistence = createPersistence();
    const stripeClient = createStripeClient();

    const response = await executeStripeTestRefundForActionRequest({
      actionRequestId: "ar_stripe",
      persistence,
      stripeClient,
      env: enabledTestRefundEnv,
      createExecutionId: () => "execution_123",
    });

    expect(response.status).toBe(200);
    expect(stripeClient.refunds.create).toHaveBeenCalledWith(
      {
        payment_intent: "pi_test",
        amount: 10000,
        reason: "requested_by_customer",
      },
      {
        idempotencyKey: "refundhold:test:refund:execution_123",
      },
    );

    const persistedJson = JSON.stringify(
      vi.mocked(persistence.beginStripeTestRefundExecution).mock.calls,
    );
    expect(persistedJson).toContain(
      createHash("sha256")
        .update("refundhold:test:refund:execution_123")
        .digest("hex"),
    );
    expect(persistedJson).not.toContain("refundhold:test:refund:execution_123");
  });

  it("creates a Charge refund when the reflected target is a Charge", async () => {
    const stripeClient = createStripeClient();

    await executeStripeTestRefundForActionRequest({
      actionRequestId: "ar_stripe",
      persistence: createPersistence({
        actionRequest: {
          ...defaultActionRequest,
          resource: {
            type: "stripe.charge",
            charge_id: "ch_test",
            livemode: false,
          },
          parameters: {
            charge_id: "ch_test",
            amount_minor: 2500,
            currency: "usd",
          },
          stripePaymentObject: {
            ...defaultStripePaymentObject,
            paymentIntentId: undefined,
            chargeId: "ch_test",
            amountMinor: 4000,
            amountRefundedMinor: 500,
            currency: "usd",
          },
        },
      }),
      stripeClient,
      env: enabledTestRefundEnv,
      createExecutionId: () => "execution_charge",
    });

    expect(stripeClient.refunds.create).toHaveBeenCalledWith(
      {
        charge: "ch_test",
        amount: 2500,
      },
      {
        idempotencyKey: "refundhold:test:refund:execution_charge",
      },
    );
  });

  it("finalizes successful Stripe refunds with safe response data", async () => {
    const persistence = createPersistence();

    await executeStripeTestRefundForActionRequest({
      actionRequestId: "ar_stripe",
      persistence,
      stripeClient: createStripeClient(),
      env: enabledTestRefundEnv,
      createExecutionId: () => "execution_123",
    });

    expect(persistence.markStripeTestRefundExecutionSucceeded).toHaveBeenCalledWith(
      expect.objectContaining({
        actionRequestId: "ar_stripe",
        executionId: "execution_123",
        stripeRefundId: "re_test",
        stripeStatus: "succeeded",
        stripeRequestId: "req_test",
        safeResponse: {
          refundId: "re_test",
          paymentIntentId: "pi_test",
          chargeId: "ch_test",
          amountMinor: 10000,
          currency: "usd",
          status: "succeeded",
          livemode: false,
          created: 1_776_000_300,
          reason: "requested_by_customer",
        },
      }),
    );
  });

  it("marks execution failed on Stripe errors and redacts keys", async () => {
    const stripeKey = `sk_test_${"a".repeat(24)}`;
    const persistence = createPersistence();
    const stripeClient = createStripeClient({
      createError: new Error(`Stripe rejected ${stripeKey}`),
    });

    const response = await executeStripeTestRefundForActionRequest({
      actionRequestId: "ar_stripe",
      persistence,
      stripeClient,
      env: enabledTestRefundEnv,
      createExecutionId: () => "execution_123",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "execution_failed",
      message: "Stripe test refund execution failed.",
    });
    expect(persistence.markStripeTestRefundExecutionFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        actionRequestId: "ar_stripe",
        executionId: "execution_123",
        stripeStatus: "failed",
        safeError: {
          message: "Stripe rejected sk_test_***",
        },
      }),
    );
    expect(
      JSON.stringify(
        vi.mocked(persistence.markStripeTestRefundExecutionFailed).mock.calls,
      ),
    ).not.toContain(stripeKey);
  });
});

const defaultStripePaymentObject = {
  id: "spo_123",
  organizationId: "org_123",
  connectorId: "conn_123",
  mode: "TEST" as const,
  paymentIntentId: "pi_test",
  chargeId: "ch_test",
  amountMinor: 20000,
  amountRefundedMinor: 5000,
  currency: "usd",
  status: "succeeded",
  livemode: false,
  safeSnapshot: {
    paymentIntentId: "pi_test",
    chargeId: "ch_test",
    amountMinor: 20000,
    amountRefundedMinor: 5000,
    currency: "usd",
    status: "succeeded",
    livemode: false,
    created: 1_776_000_000,
  },
};

const defaultActionRequest: StoredStripeRefundExecutableActionRequest = {
  id: "ar_stripe",
  organizationId: "org_123",
  agentId: "agent_123",
  connectorId: "conn_123",
  connectorType: "stripe_test",
  decision: "APPROVAL_REQUIRED",
  status: "APPROVED",
  operation: "refund.create",
  resource: {
    type: "stripe.payment_intent",
    payment_intent_id: "pi_test",
    charge_id: "ch_test",
    livemode: false,
  },
  parameters: {
    payment_intent_id: "pi_test",
    charge_id: "ch_test",
    amount_minor: 10000,
    currency: "usd",
    reason: "requested_by_customer",
  },
  approvedApprovalId: "approval_123",
  stripePaymentObject: defaultStripePaymentObject,
  existingStripeRefund: null,
  completedExecution: null,
};

function createPersistence({
  actionRequest = defaultActionRequest,
  onBegin,
  onSuccess,
}: {
  actionRequest?: StoredStripeRefundExecutableActionRequest | null;
  onBegin?: () => void;
  onSuccess?: () => void;
} = {}): StripeTestRefundExecutionPersistence {
  return {
    findActionRequestForStripeRefundExecution: vi.fn(async () => actionRequest),
    beginStripeTestRefundExecution: vi.fn(async () => {
      onBegin?.();

      return {
        executionId: "execution_123",
      };
    }),
    markStripeTestRefundExecutionSucceeded: vi.fn(async () => {
      onSuccess?.();
    }),
    markStripeTestRefundExecutionFailed: vi.fn(async () => undefined),
  };
}

function createStripeClient({
  onCreate,
  createError,
}: {
  onCreate?: () => void;
  createError?: Error;
} = {}): StripeRefundExecutionClient {
  return {
    refunds: {
      create: vi.fn(async () => {
        onCreate?.();

        if (createError) {
          throw createError;
        }

        return {
          object: "refund",
          id: "re_test",
          payment_intent: "pi_test",
          charge: "ch_test",
          amount: 10000,
          currency: "USD",
          status: "succeeded",
          livemode: false,
          created: 1_776_000_300,
          reason: "requested_by_customer",
          lastResponse: {
            requestId: "req_test",
          },
          destination_details: {
            card: {
              reference: "do_not_store",
            },
          },
        };
      }),
    },
  };
}
