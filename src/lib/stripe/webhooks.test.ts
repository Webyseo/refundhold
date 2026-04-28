import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  createSafeWebhookPayload,
  handleStripeWebhookEvent,
  type StripeWebhookProcessingPersistence,
  type StoredStripeRefundForWebhook,
} from "./webhooks";

describe("handleStripeWebhookEvent", () => {
  it("returns duplicate without reprocessing an existing Stripe event", async () => {
    const persistence = createPersistence({
      duplicate: true,
    });

    const result = await handleStripeWebhookEvent({
      event: createRefundEvent(),
      rawBody: rawBodyFixture,
      persistence,
    });

    expect(result).toEqual({
      outcome: "duplicate",
      stripeEventId: "evt_refund_created",
    });
    expect(persistence.findStripeRefundForWebhook).not.toHaveBeenCalled();
    expect(persistence.processStripeRefundWebhook).not.toHaveBeenCalled();
  });

  it("ignores live mode events without mutating StripeRefund", async () => {
    const persistence = createPersistence();

    const result = await handleStripeWebhookEvent({
      event: createRefundEvent({
        livemode: true,
      }),
      rawBody: rawBodyFixture,
      persistence,
    });

    expect(result.outcome).toBe("ignored");
    expect(persistence.markStripeWebhookEventIgnored).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeEventId: "evt_refund_created",
        errorMessage: "Live mode Stripe webhook events are ignored in v1.",
      }),
    );
    expect(persistence.findStripeRefundForWebhook).not.toHaveBeenCalled();
  });

  it("processes refund.created for a matching StripeRefund", async () => {
    const persistence = createPersistence();

    const result = await handleStripeWebhookEvent({
      event: createRefundEvent({
        type: "refund.created",
        refundStatus: "pending",
      }),
      rawBody: rawBodyFixture,
      persistence,
    });

    expect(result.outcome).toBe("processed");
    expect(persistence.findStripeRefundForWebhook).toHaveBeenCalledWith({
      stripeRefundId: "re_test",
      actionRequestId: "ar_123",
      executionId: "execution_123",
    });
    expect(persistence.processStripeRefundWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeEventId: "evt_refund_created",
        stripeRefundRecordId: "stripe_refund_123",
        stripeStatus: "pending",
        safeResponse: expect.objectContaining({
          refundId: "re_test",
          paymentIntentId: "pi_test",
          chargeId: "ch_test",
          amountMinor: 10000,
          currency: "usd",
          status: "pending",
          livemode: false,
        }),
      }),
    );
  });

  it("processes refund.updated for a matching StripeRefund", async () => {
    const persistence = createPersistence();

    await handleStripeWebhookEvent({
      event: createRefundEvent({
        type: "refund.updated",
        id: "evt_refund_updated",
        refundStatus: "succeeded",
      }),
      rawBody: rawBodyFixture,
      persistence,
    });

    expect(persistence.processStripeRefundWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeEventId: "evt_refund_updated",
        stripeStatus: "succeeded",
      }),
    );
  });

  it("processes refund.failed with refund failure audit", async () => {
    const persistence = createPersistence();

    await handleStripeWebhookEvent({
      event: createRefundEvent({
        type: "refund.failed",
        id: "evt_refund_failed",
        refundStatus: "failed",
      }),
      rawBody: rawBodyFixture,
      persistence,
    });

    const call = vi.mocked(persistence.processStripeRefundWebhook).mock.calls[0]?.[0];

    expect(call?.auditEvents.map((event) => event.type)).toEqual([
      "STRIPE_WEBHOOK_PROCESSED",
      "STRIPE_REFUND_STATUS_UPDATED",
      "STRIPE_REFUND_FAILED",
    ]);
  });

  it("ignores refund events without a matching StripeRefund", async () => {
    const persistence = createPersistence({
      stripeRefund: null,
    });

    const result = await handleStripeWebhookEvent({
      event: createRefundEvent(),
      rawBody: rawBodyFixture,
      persistence,
    });

    expect(result.outcome).toBe("ignored");
    expect(persistence.markStripeWebhookEventIgnored).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeEventId: "evt_refund_created",
        errorMessage: "No matching StripeRefund.",
      }),
    );
    expect(persistence.processStripeRefundWebhook).not.toHaveBeenCalled();
  });

  it("ignores unsupported event types", async () => {
    const persistence = createPersistence();

    const result = await handleStripeWebhookEvent({
      event: createRefundEvent({
        type: "charge.refunded",
        id: "evt_charge_refunded",
      }),
      rawBody: rawBodyFixture,
      persistence,
    });

    expect(result.outcome).toBe("ignored");
    expect(persistence.markStripeWebhookEventIgnored).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeEventId: "evt_charge_refunded",
        errorMessage: "Unsupported Stripe webhook event type.",
      }),
    );
  });

  it("stores only a safe payload and a raw payload hash", async () => {
    const persistence = createPersistence();

    await handleStripeWebhookEvent({
      event: createRefundEvent(),
      rawBody: rawBodyFixture,
      persistence,
    });

    expect(persistence.createReceivedStripeWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payloadHash: createHash("sha256").update(rawBodyFixture).digest("hex"),
        safePayload: expect.objectContaining({
          event_id: "evt_refund_created",
          type: "refund.created",
          object_id: "re_test",
          refundhold_metadata: {
            refundhold_action_request_id: "ar_123",
            refundhold_execution_id: "execution_123",
            refundhold_mode: "test",
          },
        }),
      }),
    );
    const safePayloadJson = JSON.stringify(
      vi.mocked(persistence.createReceivedStripeWebhookEvent).mock.calls[0]?.[0]
        .safePayload,
    );
    expect(safePayloadJson).not.toContain("Stripe-Signature");
    expect(safePayloadJson).not.toContain("whsec_test_fixture");
    expect(safePayloadJson).not.toContain("customer@example.test");
    expect(safePayloadJson).not.toContain("card");
  });
});

describe("createSafeWebhookPayload", () => {
  it("does not include full webhook payload fields", () => {
    const safePayload = createSafeWebhookPayload(createRefundEvent());

    expect(safePayload).toEqual(
      expect.objectContaining({
        event_id: "evt_refund_created",
        type: "refund.created",
        livemode: false,
        object_id: "re_test",
        object: "refund",
        amount_minor: 10000,
        currency: "usd",
        status: "pending",
        payment_intent_id: "pi_test",
        charge_id: "ch_test",
      }),
    );
    expect(JSON.stringify(safePayload)).not.toContain("billing_details");
  });
});

const rawBodyFixture = JSON.stringify({
  id: "evt_refund_created",
  type: "refund.created",
});

const defaultStripeRefund: StoredStripeRefundForWebhook = {
  id: "stripe_refund_123",
  organizationId: "org_123",
  connectorId: "conn_123",
  actionRequestId: "ar_123",
  executionId: "execution_123",
  agentId: "agent_123",
  stripeRefundId: "re_test",
};

function createPersistence({
  duplicate = false,
  stripeRefund = defaultStripeRefund,
}: {
  duplicate?: boolean;
  stripeRefund?: StoredStripeRefundForWebhook | null;
} = {}): StripeWebhookProcessingPersistence {
  return {
    createReceivedStripeWebhookEvent: vi.fn(async () => {
      return {
        duplicate,
        status: duplicate ? ("PROCESSED" as const) : ("RECEIVED" as const),
      };
    }),
    markStripeWebhookEventIgnored: vi.fn(async () => undefined),
    findStripeRefundForWebhook: vi.fn(async () => stripeRefund),
    processStripeRefundWebhook: vi.fn(async () => undefined),
  };
}

function createRefundEvent({
  id = "evt_refund_created",
  type = "refund.created",
  livemode = false,
  refundStatus = "pending",
}: {
  id?: string;
  type?: string;
  livemode?: boolean;
  refundStatus?: string;
} = {}) {
  return {
    id,
    type,
    livemode,
    created: 1_776_000_500,
    data: {
      object: {
        object: "refund",
        id: "re_test",
        payment_intent: "pi_test",
        charge: "ch_test",
        amount: 10000,
        currency: "USD",
        status: refundStatus,
        livemode,
        created: 1_776_000_400,
        reason: "requested_by_customer",
        metadata: {
          refundhold_action_request_id: "ar_123",
          refundhold_execution_id: "execution_123",
          refundhold_mode: "test",
          customer_email: "customer@example.test",
        },
        destination_details: {
          card: {
            reference: "do_not_store",
          },
        },
      },
    },
  };
}
