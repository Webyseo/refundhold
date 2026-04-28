import type {
  StripeSafePaymentSnapshot,
  StripeSafeRefundSnapshot,
} from "./types";

type StripeObjectRecord = Record<string, unknown>;

type ExpandableId =
  | string
  | {
      id?: unknown;
    }
  | null
  | undefined;

export function normalizeStripeAmountMinor(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error("Stripe amount must be an integer in minor units.");
  }

  return value;
}

export function normalizeStripeCurrency(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Stripe currency is required.");
  }

  return value.trim().toLowerCase();
}

export function assertStripeTestModeObject(object: StripeObjectRecord): asserts object is
  StripeObjectRecord & { livemode: false } {
  if (object.livemode === false) {
    return;
  }

  if (object.livemode === true) {
    throw new Error(
      `Stripe object ${readObjectId(object)} is live mode; v1 only accepts test mode.`,
    );
  }

  throw new Error(
    `Stripe object ${readObjectId(object)} is not confirmed test mode; v1 only accepts test mode.`,
  );
}

export function createSafePaymentSnapshot(
  object: StripeObjectRecord,
): StripeSafePaymentSnapshot {
  assertStripeTestModeObject(object);

  const objectType = readRequiredString(object.object, "Stripe object type");

  if (objectType === "payment_intent") {
    const latestCharge = getExpandableId(object.latest_charge);

    return withDefinedValues({
      paymentIntentId: readRequiredString(object.id, "Stripe PaymentIntent id"),
      chargeId: latestCharge,
      amountMinor: normalizeStripeAmountMinor(object.amount),
      amountRefundedMinor: getExpandedChargeAmountRefunded(object.latest_charge),
      currency: normalizeStripeCurrency(object.currency),
      status: readRequiredString(object.status, "Stripe PaymentIntent status"),
      customerId: getExpandableId(object.customer),
      livemode: false,
      created: normalizeStripeCreated(object.created),
    });
  }

  if (objectType === "charge") {
    return withDefinedValues({
      paymentIntentId: getExpandableId(object.payment_intent),
      chargeId: readRequiredString(object.id, "Stripe Charge id"),
      amountMinor: normalizeStripeAmountMinor(object.amount),
      amountRefundedMinor: normalizeStripeAmountMinor(object.amount_refunded),
      currency: normalizeStripeCurrency(object.currency),
      status: readRequiredString(object.status, "Stripe Charge status"),
      customerId: getExpandableId(object.customer),
      livemode: false,
      created: normalizeStripeCreated(object.created),
    });
  }

  throw new Error(`Unsupported Stripe payment object type: ${objectType}.`);
}

export function createSafeRefundSnapshot(
  object: StripeObjectRecord,
): StripeSafeRefundSnapshot {
  const objectType = readRequiredString(object.object, "Stripe object type");

  if (objectType !== "refund") {
    throw new Error(`Unsupported Stripe refund object type: ${objectType}.`);
  }

  assertStripeRefundTestModeObject(object);

  return withDefinedValues({
    refundId: readRequiredString(object.id, "Stripe Refund id"),
    paymentIntentId: getExpandableId(object.payment_intent),
    chargeId: getExpandableId(object.charge),
    amountMinor: normalizeStripeAmountMinor(object.amount),
    currency: normalizeStripeCurrency(object.currency),
    status: readRequiredString(object.status, "Stripe Refund status"),
    livemode: false,
    created: normalizeStripeCreated(object.created),
  });
}

function assertStripeRefundTestModeObject(object: StripeObjectRecord): void {
  if (object.livemode === true) {
    throw new Error(
      `Stripe object ${readObjectId(object)} is live mode; v1 only accepts test mode.`,
    );
  }

  if (object.livemode !== undefined && object.livemode !== false) {
    throw new Error(
      `Stripe object ${readObjectId(object)} is not confirmed test mode; v1 only accepts test mode.`,
    );
  }
}

function getExpandedChargeAmountRefunded(value: unknown): number {
  if (isRecord(value) && typeof value.amount_refunded === "number") {
    return normalizeStripeAmountMinor(value.amount_refunded);
  }

  return 0;
}

function getExpandableId(value: unknown): string | undefined {
  const candidate = value as ExpandableId;

  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate;
  }

  if (isRecord(candidate) && typeof candidate.id === "string") {
    const id = candidate.id.trim();

    return id.length > 0 ? id : undefined;
  }

  return undefined;
}

function readRequiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function normalizeStripeCreated(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error("Stripe created timestamp must be an integer.");
  }

  return value;
}

function readObjectId(object: StripeObjectRecord): string {
  return typeof object.id === "string" && object.id.trim().length > 0
    ? object.id.trim()
    : "unknown";
}

function withDefinedValues<TObject extends Record<string, unknown>>(
  object: TObject,
): TObject {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  ) as TObject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
