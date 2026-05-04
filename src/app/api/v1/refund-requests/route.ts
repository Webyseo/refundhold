import type { JsonObject, JsonValue } from "@/lib/action-requests/handler";
import type { RefundRequestCreateResponse } from "@/lib/public-contracts";

import { createActionRequestResponse } from "../action-requests/create-action-request-response";

const reviewUrlBasePath = "/app/refund-requests";

const invalidJsonResponse = {
  error: "invalid_payload",
  message: "Request body is invalid.",
};

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(invalidJsonResponse, {
      status: 400,
    });
  }

  const response = await createActionRequestResponse({
    request,
    body: normalizeRefundRequestBody(body),
    approvalUrlBasePath: reviewUrlBasePath,
  });

  return Response.json(toRefundRequestResponse(response.body), {
    status: response.status,
  });
}

function normalizeRefundRequestBody(body: unknown): unknown {
  if (!isJsonObject(body) || isCompatibilityActionRequestBody(body)) {
    return body;
  }

  const amountMinor = body["amount"];
  const currency = getString(body["currency"]);
  const reason = getString(body["reason"]);
  const stripeMode = getString(body["stripe_mode"]);

  if (
    typeof amountMinor !== "number" ||
    !Number.isSafeInteger(amountMinor) ||
    amountMinor <= 0 ||
    !currency ||
    !reason ||
    (stripeMode && stripeMode !== "demo_simulation")
  ) {
    return body;
  }

  return {
    connector: "stripe_test",
    action: "refund.create",
    resource: {
      refund_id: `demo_refund_${amountMinor}`,
    },
    parameters: {
      amount: amountMinor / 100,
      currency: currency.toUpperCase(),
    },
    context: {
      reason,
      source: "demo_simulation",
      stripe_mode: stripeMode ?? "demo_simulation",
    },
  };
}

function toRefundRequestResponse(
  body: JsonObject,
): JsonObject | RefundRequestCreateResponse {
  const actionRequestId = getString(body["action_request_id"]);
  const decision = mapDecision(getString(body["decision"]));
  const reason = getPublicReason({
    decision,
    reason: getString(body["reason"]),
  });

  if (!actionRequestId) {
    return {
      ...body,
      ...(decision ? { decision } : {}),
      ...(reason ? { reason } : {}),
    };
  }

  return {
    refund_request_id: actionRequestId,
    decision: decision ?? body["decision"] ?? "blocked",
    reason: reason ?? "Refund request received.",
    review_url: `${reviewUrlBasePath}/${actionRequestId}`,
  } as RefundRequestCreateResponse;
}

function mapDecision(decision: string | undefined): string | undefined {
  if (decision === "approval_required") {
    return "needs_review";
  }

  if (decision === "allow") {
    return "allowed";
  }

  if (decision === "deny" || decision === "denied" || decision === "blocked") {
    return "blocked";
  }

  return decision;
}

function getPublicReason({
  decision,
  reason,
}: {
  decision: string | undefined;
  reason: string | undefined;
}): string | undefined {
  if (!reason) {
    return undefined;
  }

  if (decision === "needs_review") {
    return "Human approval required for refunds between $50 and $500";
  }

  if (decision === "allowed") {
    return "Refund allowed by policy.";
  }

  if (decision === "blocked") {
    return "Refund blocked by policy.";
  }

  return reason;
}

function isCompatibilityActionRequestBody(body: JsonObject): boolean {
  return Boolean(
    getString(body["connector"]) &&
      getString(body["action"]) &&
      body["resource"] !== undefined,
  );
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getString(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
