import { env as processEnv } from "node:process";

import { getStripeTestClient } from "./client";
import {
  createSafePaymentSnapshot,
  normalizeStripeAmountMinor,
} from "./snapshots";
import type {
  StripePaymentTarget,
  StripeSafePaymentSnapshot,
} from "./types";
import type { StripeSafetyEnv } from "./config";

export type StripePaymentReflectionClient = {
  paymentIntents: {
    retrieve: (
      id: string,
      params: { expand: string[] },
    ) => Promise<unknown>;
  };
  charges: {
    retrieve: (id: string) => Promise<unknown>;
  };
};

export type ReflectedStripePaymentObject = {
  paymentIntentId?: string;
  chargeId?: string;
  amountMinor: number;
  amountRefundedMinor: number;
  refundableAmountMinor: number;
  requestedAmountMinor: number;
  currency: string;
  status: string;
  livemode: false;
  safeSnapshot: StripeSafePaymentSnapshot;
};

export type ReflectStripeTestPaymentObjectInput = {
  target: StripePaymentTarget;
  requestedAmountMinor: number;
  stripeClient?: StripePaymentReflectionClient;
  env?: StripeSafetyEnv;
};

export async function reflectStripeTestPaymentObjectForRefund({
  target,
  requestedAmountMinor,
  stripeClient,
  env = processEnv,
}: ReflectStripeTestPaymentObjectInput): Promise<ReflectedStripePaymentObject> {
  const client = stripeClient ?? getStripeTestClient(env);
  const normalizedRequestedAmountMinor =
    normalizeRequestedRefundAmount(requestedAmountMinor);
  const stripeObject = await retrieveStripePaymentObject(client, target);

  if (target.paymentIntentId) {
    assertPaymentIntentHasExpandedChargeRefundTotal(stripeObject);
  }

  const safeSnapshot = createSafePaymentSnapshot(stripeObject);
  const refundableAmountMinor =
    safeSnapshot.amountMinor - safeSnapshot.amountRefundedMinor;

  if (refundableAmountMinor < 0) {
    throw new Error("Stripe payment object has invalid refunded amount.");
  }

  if (normalizedRequestedAmountMinor > refundableAmountMinor) {
    throw new Error(
      "Requested refund amount exceeds the refundable Stripe amount.",
    );
  }

  return {
    paymentIntentId: safeSnapshot.paymentIntentId,
    chargeId: safeSnapshot.chargeId,
    amountMinor: safeSnapshot.amountMinor,
    amountRefundedMinor: safeSnapshot.amountRefundedMinor,
    refundableAmountMinor,
    requestedAmountMinor: normalizedRequestedAmountMinor,
    currency: safeSnapshot.currency,
    status: safeSnapshot.status,
    livemode: false,
    safeSnapshot,
  };
}

async function retrieveStripePaymentObject(
  stripeClient: StripePaymentReflectionClient,
  target: StripePaymentTarget,
): Promise<Record<string, unknown>> {
  if (target.paymentIntentId && target.chargeId) {
    throw new Error(
      "Stripe refund proposals must include only one payment_intent_id or charge_id.",
    );
  }

  if (target.paymentIntentId) {
    return assertStripeObjectRecord(await stripeClient.paymentIntents.retrieve(target.paymentIntentId, {
      expand: ["latest_charge"],
    }));
  }

  if (target.chargeId) {
    return assertStripeObjectRecord(await stripeClient.charges.retrieve(target.chargeId));
  }

  throw new Error(
    "Stripe refund proposals require payment_intent_id or charge_id.",
  );
}

function assertStripeObjectRecord(value: unknown): Record<string, unknown> {
  if (isRecord(value)) {
    return value;
  }

  throw new Error("Stripe payment object response was incomplete.");
}

function normalizeRequestedRefundAmount(value: unknown): number {
  if (typeof value !== "number" || value <= 0) {
    throw new Error(
      "Stripe refund proposals require a positive integer amount_minor.",
    );
  }

  return normalizeStripeAmountMinor(value);
}

function assertPaymentIntentHasExpandedChargeRefundTotal(
  stripeObject: Record<string, unknown>,
) {
  const latestCharge = stripeObject["latest_charge"];

  if (!isRecord(latestCharge) || typeof latestCharge["amount_refunded"] !== "number") {
    throw new Error(
      "Stripe PaymentIntent must include an expanded latest_charge with amount_refunded.",
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
