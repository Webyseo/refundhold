import { describe, expect, it } from "vitest";

import {
  assertStripeTestModeObject,
  createSafePaymentSnapshot,
  createSafeRefundSnapshot,
  normalizeStripeAmountMinor,
  normalizeStripeCurrency,
} from "./snapshots";

describe("Stripe snapshot helpers", () => {
  it("rejects live mode Stripe objects", () => {
    expect(() => {
      assertStripeTestModeObject({
        id: "pi_live",
        livemode: true,
      });
    }).toThrow("Stripe object pi_live is live mode; v1 only accepts test mode.");
  });

  it("accepts test mode Stripe objects", () => {
    expect(() => {
      assertStripeTestModeObject({
        id: "pi_test",
        livemode: false,
      });
    }).not.toThrow();
  });

  it("creates a safe payment snapshot from a PaymentIntent", () => {
    const snapshot = createSafePaymentSnapshot({
      object: "payment_intent",
      id: "pi_test",
      amount: 1299,
      currency: "USD",
      status: "succeeded",
      livemode: false,
      created: 1_776_000_000,
      customer: "cus_test",
      latest_charge: "ch_test",
      metadata: {
        internal_note: "do not persist whole object",
      },
      client_secret: "pi_test_secret_should_not_persist",
    });

    expect(snapshot).toEqual({
      paymentIntentId: "pi_test",
      chargeId: "ch_test",
      amountMinor: 1299,
      amountRefundedMinor: 0,
      currency: "usd",
      status: "succeeded",
      customerId: "cus_test",
      livemode: false,
      created: 1_776_000_000,
    });
    expect(Object.keys(snapshot).sort()).toEqual([
      "amountMinor",
      "amountRefundedMinor",
      "chargeId",
      "created",
      "currency",
      "customerId",
      "livemode",
      "paymentIntentId",
      "status",
    ]);
  });

  it("creates a safe payment snapshot from a Charge", () => {
    const snapshot = createSafePaymentSnapshot({
      object: "charge",
      id: "ch_test",
      payment_intent: "pi_test",
      amount: 2500,
      amount_refunded: 500,
      currency: "usd",
      status: "succeeded",
      livemode: false,
      created: 1_776_000_100,
      customer: "cus_test",
      billing_details: {
        email: "customer@example.test",
      },
    });

    expect(snapshot).toEqual({
      paymentIntentId: "pi_test",
      chargeId: "ch_test",
      amountMinor: 2500,
      amountRefundedMinor: 500,
      currency: "usd",
      status: "succeeded",
      customerId: "cus_test",
      livemode: false,
      created: 1_776_000_100,
    });
    expect(snapshot).not.toHaveProperty("billing_details");
  });

  it("creates a safe refund snapshot", () => {
    const snapshot = createSafeRefundSnapshot({
      object: "refund",
      id: "re_test",
      payment_intent: "pi_test",
      charge: "ch_test",
      amount: 750,
      currency: "USD",
      status: "succeeded",
      livemode: false,
      created: 1_776_000_200,
      metadata: {
        internal_note: "do not persist whole object",
      },
    });

    expect(snapshot).toEqual({
      refundId: "re_test",
      paymentIntentId: "pi_test",
      chargeId: "ch_test",
      amountMinor: 750,
      currency: "usd",
      status: "succeeded",
      livemode: false,
      created: 1_776_000_200,
    });
    expect(snapshot).not.toHaveProperty("metadata");
  });

  it("normalizes amount minor units", () => {
    expect(normalizeStripeAmountMinor(0)).toBe(0);
    expect(normalizeStripeAmountMinor(1234)).toBe(1234);
    expect(() => normalizeStripeAmountMinor(12.34)).toThrow(
      "Stripe amount must be an integer in minor units.",
    );
  });

  it("normalizes currency values", () => {
    expect(normalizeStripeCurrency("USD")).toBe("usd");
    expect(normalizeStripeCurrency(" eur ")).toBe("eur");
    expect(() => normalizeStripeCurrency("")).toThrow(
      "Stripe currency is required.",
    );
  });
});
