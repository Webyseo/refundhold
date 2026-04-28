import { describe, expect, it, vi } from "vitest";

import {
  reflectStripeTestPaymentObjectForRefund,
  type StripePaymentReflectionClient,
} from "./payment-reflection";

describe("reflectStripeTestPaymentObjectForRefund", () => {
  it("fails closed when Stripe test mode is disabled", async () => {
    await expect(
      reflectStripeTestPaymentObjectForRefund({
        target: {
          paymentIntentId: "pi_test_disabled",
        },
        requestedAmountMinor: 1000,
        env: {},
      }),
    ).rejects.toThrow(
      "AUTHRAIL_STRIPE_TEST_MODE_ENABLED is disabled; Stripe test client is unavailable.",
    );
  });

  it("rejects live mode objects", async () => {
    const stripeClient = createStripeClient({
      paymentIntent: {
        object: "payment_intent",
        id: "pi_live",
        amount: 1000,
        currency: "usd",
        status: "succeeded",
        livemode: true,
        created: 1_776_000_000,
        latest_charge: {
          object: "charge",
          id: "ch_live",
          amount_refunded: 0,
        },
      },
    });

    await expect(
      reflectStripeTestPaymentObjectForRefund({
        target: {
          paymentIntentId: "pi_live",
        },
        requestedAmountMinor: 1000,
        stripeClient,
      }),
    ).rejects.toThrow(
      "Stripe object pi_live is live mode; v1 only accepts test mode.",
    );
  });

  it("rejects a requested amount above the refundable amount", async () => {
    const stripeClient = createStripeClient({
      charge: {
        object: "charge",
        id: "ch_test",
        payment_intent: "pi_test",
        amount: 2500,
        amount_refunded: 2000,
        currency: "usd",
        status: "succeeded",
        livemode: false,
        created: 1_776_000_000,
      },
    });

    await expect(
      reflectStripeTestPaymentObjectForRefund({
        target: {
          chargeId: "ch_test",
        },
        requestedAmountMinor: 600,
        stripeClient,
      }),
    ).rejects.toThrow(
      "Requested refund amount exceeds the refundable Stripe amount.",
    );
  });

  it("reflects a valid PaymentIntent test object with a safe snapshot", async () => {
    const stripeClient = createStripeClient({
      paymentIntent: {
        object: "payment_intent",
        id: "pi_test",
        amount: 5000,
        currency: "USD",
        status: "succeeded",
        livemode: false,
        created: 1_776_000_000,
        customer: "cus_test",
        latest_charge: {
          object: "charge",
          id: "ch_test",
          amount_refunded: 1200,
        },
        client_secret: "pi_test_secret_not_safe",
      },
    });

    const reflected = await reflectStripeTestPaymentObjectForRefund({
      target: {
        paymentIntentId: "pi_test",
      },
      requestedAmountMinor: 3000,
      stripeClient,
    });

    expect(stripeClient.paymentIntents.retrieve).toHaveBeenCalledWith(
      "pi_test",
      {
        expand: ["latest_charge"],
      },
    );
    expect(reflected).toEqual({
      paymentIntentId: "pi_test",
      chargeId: "ch_test",
      amountMinor: 5000,
      amountRefundedMinor: 1200,
      refundableAmountMinor: 3800,
      requestedAmountMinor: 3000,
      currency: "usd",
      status: "succeeded",
      livemode: false,
      safeSnapshot: {
        paymentIntentId: "pi_test",
        chargeId: "ch_test",
        amountMinor: 5000,
        amountRefundedMinor: 1200,
        currency: "usd",
        status: "succeeded",
        customerId: "cus_test",
        livemode: false,
        created: 1_776_000_000,
      },
    });
    expect(reflected.safeSnapshot).not.toHaveProperty("client_secret");
  });

  it("reflects a valid Charge test object with a safe snapshot", async () => {
    const stripeClient = createStripeClient({
      charge: {
        object: "charge",
        id: "ch_test",
        payment_intent: "pi_test",
        amount: 4000,
        amount_refunded: 500,
        currency: "usd",
        status: "succeeded",
        livemode: false,
        created: 1_776_000_000,
        billing_details: {
          email: "customer@example.test",
        },
      },
    });

    const reflected = await reflectStripeTestPaymentObjectForRefund({
      target: {
        chargeId: "ch_test",
      },
      requestedAmountMinor: 1000,
      stripeClient,
    });

    expect(stripeClient.charges.retrieve).toHaveBeenCalledWith("ch_test");
    expect(reflected.paymentIntentId).toBe("pi_test");
    expect(reflected.chargeId).toBe("ch_test");
    expect(reflected.refundableAmountMinor).toBe(3500);
    expect(reflected.safeSnapshot).not.toHaveProperty("billing_details");
  });

  it("rejects an incomplete PaymentIntent without an expanded charge refund total", async () => {
    const stripeClient = createStripeClient({
      paymentIntent: {
        object: "payment_intent",
        id: "pi_test",
        amount: 5000,
        currency: "usd",
        status: "succeeded",
        livemode: false,
        created: 1_776_000_000,
        latest_charge: "ch_test",
      },
    });

    await expect(
      reflectStripeTestPaymentObjectForRefund({
        target: {
          paymentIntentId: "pi_test",
        },
        requestedAmountMinor: 1000,
        stripeClient,
      }),
    ).rejects.toThrow(
      "Stripe PaymentIntent must include an expanded latest_charge with amount_refunded.",
    );
  });
});

function createStripeClient({
  paymentIntent,
  charge,
}: {
  paymentIntent?: Record<string, unknown>;
  charge?: Record<string, unknown>;
}): StripePaymentReflectionClient {
  return {
    paymentIntents: {
      retrieve: vi.fn(async () => {
        if (!paymentIntent) {
          throw new Error("PaymentIntent not found.");
        }

        return paymentIntent;
      }),
    },
    charges: {
      retrieve: vi.fn(async () => {
        if (!charge) {
          throw new Error("Charge not found.");
        }

        return charge;
      }),
    },
  };
}
