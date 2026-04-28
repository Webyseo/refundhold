import { createHash } from "node:crypto";

import {
  createSafeRefundSnapshot,
  normalizeStripeAmountMinor,
  normalizeStripeCurrency,
} from "./snapshots";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

type JsonObject = {
  [key: string]: JsonValue;
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  livemode: boolean;
  created: number;
  data: {
    object: unknown;
  };
};

export type StripeWebhookEventStatus =
  | "RECEIVED"
  | "PROCESSED"
  | "IGNORED"
  | "FAILED";

export type StripeWebhookOutcome =
  | "processed"
  | "ignored"
  | "duplicate"
  | "failed";

export type StripeWebhookProcessingResult = {
  outcome: StripeWebhookOutcome;
  stripeEventId: string;
};

export type StoredStripeRefundForWebhook = {
  id: string;
  organizationId: string;
  connectorId: string;
  actionRequestId: string;
  executionId: string;
  agentId: string;
  stripeRefundId: string | null;
};

export type StripeWebhookAuditEventInput = {
  type:
    | "STRIPE_WEBHOOK_RECEIVED"
    | "STRIPE_WEBHOOK_PROCESSED"
    | "STRIPE_WEBHOOK_IGNORED"
    | "STRIPE_REFUND_STATUS_UPDATED"
    | "STRIPE_REFUND_FAILED";
  metadata: JsonObject;
};

export type CreateReceivedStripeWebhookEventInput = {
  stripeEventId: string;
  mode: "TEST" | "LIVE";
  livemode: boolean;
  type: string;
  objectId?: string;
  payloadHash: string;
  safePayload: JsonObject;
};

export type StripeWebhookProcessingPersistence = {
  createReceivedStripeWebhookEvent: (
    input: CreateReceivedStripeWebhookEventInput,
  ) => Promise<{
    duplicate: boolean;
    status: StripeWebhookEventStatus;
  }>;
  markStripeWebhookEventIgnored: (input: {
    stripeEventId: string;
    errorMessage: string;
  }) => Promise<void>;
  findStripeRefundForWebhook: (input: {
    stripeRefundId: string;
    actionRequestId?: string;
    executionId?: string;
  }) => Promise<StoredStripeRefundForWebhook | null>;
  processStripeRefundWebhook: (input: {
    stripeEventId: string;
    stripeRefundRecordId: string;
    organizationId: string;
    actionRequestId: string;
    executionId: string;
    agentId: string;
    stripeStatus: string;
    safeResponse: JsonObject;
    auditEvents: StripeWebhookAuditEventInput[];
  }) => Promise<void>;
};

const supportedRefundEventTypes = new Set([
  "refund.created",
  "refund.updated",
  "refund.failed",
]);

export async function handleStripeWebhookEvent({
  event,
  rawBody,
  persistence,
}: {
  event: StripeWebhookEvent;
  rawBody: string;
  persistence: StripeWebhookProcessingPersistence;
}): Promise<StripeWebhookProcessingResult> {
  const safePayload = createSafeWebhookPayload(event);
  const received = await persistence.createReceivedStripeWebhookEvent({
    stripeEventId: event.id,
    mode: event.livemode ? "LIVE" : "TEST",
    livemode: event.livemode,
    type: event.type,
    objectId: getStripeObjectId(event.data.object),
    payloadHash: hashPayload(rawBody),
    safePayload,
  });

  if (received.duplicate) {
    return {
      outcome: "duplicate",
      stripeEventId: event.id,
    };
  }

  if (event.livemode) {
    await persistence.markStripeWebhookEventIgnored({
      stripeEventId: event.id,
      errorMessage: "Live mode Stripe webhook events are ignored in v1.",
    });

    return {
      outcome: "ignored",
      stripeEventId: event.id,
    };
  }

  if (!supportedRefundEventTypes.has(event.type)) {
    await persistence.markStripeWebhookEventIgnored({
      stripeEventId: event.id,
      errorMessage: "Unsupported Stripe webhook event type.",
    });

    return {
      outcome: "ignored",
      stripeEventId: event.id,
    };
  }

  const refundObject = readRefundObject(event.data.object);

  if (!refundObject) {
    await persistence.markStripeWebhookEventIgnored({
      stripeEventId: event.id,
      errorMessage: "Stripe refund object was incomplete.",
    });

    return {
      outcome: "ignored",
      stripeEventId: event.id,
    };
  }

  const refundId = readRequiredString(refundObject.id, "Stripe refund id");
  const refundholdMetadata = readRefundHoldMetadata(refundObject.metadata);
  const stripeRefund = await persistence.findStripeRefundForWebhook({
    stripeRefundId: refundId,
    actionRequestId: readOptionalString(
      refundholdMetadata.refundhold_action_request_id,
    ),
    executionId: readOptionalString(refundholdMetadata.refundhold_execution_id),
  });

  if (!stripeRefund) {
    await persistence.markStripeWebhookEventIgnored({
      stripeEventId: event.id,
      errorMessage: "No matching StripeRefund.",
    });

    return {
      outcome: "ignored",
      stripeEventId: event.id,
    };
  }

  const safeResponse = createSafeRefundWebhookResponse(refundObject);
  const stripeStatus = readRequiredString(refundObject.status, "Stripe refund status");

  await persistence.processStripeRefundWebhook({
    stripeEventId: event.id,
    stripeRefundRecordId: stripeRefund.id,
    organizationId: stripeRefund.organizationId,
    actionRequestId: stripeRefund.actionRequestId,
    executionId: stripeRefund.executionId,
    agentId: stripeRefund.agentId,
    stripeStatus,
    safeResponse,
    auditEvents: buildStripeRefundWebhookAuditEvents({
      event,
      stripeRefund,
      stripeStatus,
      safeResponse,
    }),
  });

  return {
    outcome: "processed",
    stripeEventId: event.id,
  };
}

export function createSafeWebhookPayload(event: StripeWebhookEvent): JsonObject {
  const object = isRecord(event.data.object) ? event.data.object : {};
  const refundholdMetadata = readRefundHoldMetadata(object.metadata);

  return withDefinedValues({
    event_id: event.id,
    type: event.type,
    livemode: event.livemode,
    created: event.created,
    object_id: getStripeObjectId(object),
    object: readOptionalString(object.object),
    amount_minor:
      typeof object.amount === "number"
        ? normalizeStripeAmountMinor(object.amount)
        : undefined,
    currency:
      typeof object.currency === "string"
        ? normalizeStripeCurrency(object.currency)
        : undefined,
    status: readOptionalString(object.status),
    payment_intent_id: readExpandableId(object.payment_intent),
    charge_id: readExpandableId(object.charge),
    reason: readOptionalString(object.reason),
    refundhold_metadata:
      Object.keys(refundholdMetadata).length > 0
        ? refundholdMetadata
        : undefined,
  });
}

function buildStripeRefundWebhookAuditEvents({
  event,
  stripeRefund,
  stripeStatus,
  safeResponse,
}: {
  event: StripeWebhookEvent;
  stripeRefund: StoredStripeRefundForWebhook;
  stripeStatus: string;
  safeResponse: JsonObject;
}): StripeWebhookAuditEventInput[] {
  const baseMetadata = withDefinedValues({
    stripe_event_id: event.id,
    stripe_event_type: event.type,
    stripe_refund_id: stripeRefund.stripeRefundId,
    stripe_status: stripeStatus,
    action_request_id: stripeRefund.actionRequestId,
    execution_id: stripeRefund.executionId,
    livemode: false,
  });
  const auditEvents: StripeWebhookAuditEventInput[] = [
    {
      type: "STRIPE_WEBHOOK_PROCESSED",
      metadata: {
        ...baseMetadata,
        event: "stripe_webhook_processed",
      },
    },
    {
      type: "STRIPE_REFUND_STATUS_UPDATED",
      metadata: {
        ...baseMetadata,
        event: "stripe_refund_status_updated",
        safe_response: safeResponse,
      },
    },
  ];

  if (event.type === "refund.failed") {
    auditEvents.push({
      type: "STRIPE_REFUND_FAILED",
      metadata: {
        ...baseMetadata,
        event: "stripe_refund_failed",
      },
    });
  }

  return auditEvents;
}

function createSafeRefundWebhookResponse(refundObject: Record<string, unknown>): JsonObject {
  const snapshot = createSafeRefundSnapshot(refundObject);
  const refundholdMetadata = readRefundHoldMetadata(refundObject.metadata);

  return withDefinedValues({
    refundId: snapshot.refundId,
    paymentIntentId: snapshot.paymentIntentId,
    chargeId: snapshot.chargeId,
    amountMinor: snapshot.amountMinor,
    currency: snapshot.currency,
    status: snapshot.status,
    livemode: false,
    created: snapshot.created,
    reason: readOptionalString(refundObject.reason),
    refundholdMetadata:
      Object.keys(refundholdMetadata).length > 0
        ? refundholdMetadata
        : undefined,
  });
}

function readRefundObject(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || value.object !== "refund") {
    return null;
  }

  return value;
}

function readRefundHoldMetadata(value: unknown): JsonObject {
  if (!isRecord(value)) {
    return {};
  }

  return withDefinedValues({
    refundhold_action_request_id: readOptionalString(
      value.refundhold_action_request_id,
    ),
    refundhold_execution_id: readOptionalString(value.refundhold_execution_id),
    refundhold_mode:
      value.refundhold_mode === "test" ? "test" : undefined,
  });
}

function getStripeObjectId(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return readOptionalString(value.id);
}

function readExpandableId(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (isRecord(value)) {
    return readOptionalString(value.id);
  }

  return undefined;
}

function readRequiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function hashPayload(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

function withDefinedValues(
  object: Record<string, JsonValue | undefined>,
): JsonObject {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  ) as JsonObject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
