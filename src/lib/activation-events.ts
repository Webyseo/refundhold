export const activationEventNames = [
  "landing_viewed",
  "landing_demo_cta_clicked",
  "demo_started",
  "demo_policy_matched",
  "demo_review_opened",
  "demo_refund_approved",
  "demo_refund_rejected",
  "demo_audit_viewed",
  "quickstart_viewed",
  "api_curl_copied",
] as const;

export type ActivationEventName = (typeof activationEventNames)[number];

export type ActivationEventMetadata = {
  route?: string;
  step?: string;
  outcome?: string;
  timestamp?: string;
};

export type ActivationEventPayload = {
  eventName: ActivationEventName;
  metadata: ActivationEventMetadata;
  sessionId: string | null;
};

const allowedEventNames = new Set<string>(activationEventNames);
const allowedMetadataKeys = ["route", "step", "outcome", "timestamp"] as const;

type ActivationEventParseResult =
  | {
      ok: true;
      payload: ActivationEventPayload;
    }
  | {
      ok: false;
      reason: "invalid_payload" | "unknown_event";
    };

export function isActivationEventName(
  value: unknown,
): value is ActivationEventName {
  return typeof value === "string" && allowedEventNames.has(value);
}

export function parseActivationEventPayload(
  input: unknown,
): ActivationEventParseResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      reason: "invalid_payload",
    };
  }

  if (!isActivationEventName(input["eventName"])) {
    return {
      ok: false,
      reason:
        typeof input["eventName"] === "string"
          ? "unknown_event"
          : "invalid_payload",
    };
  }

  const sessionId = sanitizeString(input["sessionId"], 100);
  const metadata = sanitizeActivationEventMetadata(input["metadata"]);

  return {
    ok: true,
    payload: {
      eventName: input["eventName"],
      metadata,
      sessionId,
    },
  };
}

function sanitizeActivationEventMetadata(
  input: unknown,
): ActivationEventMetadata {
  if (!isRecord(input)) {
    return {};
  }

  const metadata: ActivationEventMetadata = {};

  for (const key of allowedMetadataKeys) {
    const value = sanitizeString(input[key], key === "timestamp" ? 80 : 200);

    if (value) {
      metadata[key] = value;
    }
  }

  return metadata;
}

function sanitizeString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
