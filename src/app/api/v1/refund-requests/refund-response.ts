import type { JsonObject, JsonValue } from "@/lib/action-requests/handler";
import type {
  RefundRequestErrorResponse,
  RefundRequestExecutionResponse,
  RefundRequestReviewResponse,
} from "@/lib/public-contracts";

export type RefundRequestAliasAction = "approve" | "reject" | "execute";
type RefundRequestAliasResponse =
  | RefundRequestReviewResponse
  | RefundRequestExecutionResponse
  | RefundRequestErrorResponse;

export async function toRefundRequestJsonResponse({
  action,
  fallbackId,
  response,
}: {
  action: RefundRequestAliasAction;
  fallbackId: string;
  response: Response;
}) {
  const body = await response.json().catch(() => {
    return {
      error: "invalid_response",
      message: "Refund request response was not valid JSON.",
    };
  });

  return Response.json(toRefundRequestBody(body, { action, fallbackId }), {
    status: response.status,
  });
}

export function toRefundRequestBody(
  body: unknown,
  {
    action,
    fallbackId,
  }: {
    action: RefundRequestAliasAction;
    fallbackId: string;
  },
): RefundRequestAliasResponse {
  if (!isJsonObject(body)) {
    return {
      error: "invalid_response",
      message: "Refund request response was not valid JSON.",
    };
  }

  const refundRequestId =
    getString(body["action_request_id"]) ?? cleanString(fallbackId);
  const status = mapPublicState(getString(body["status"]));
  const decision = mapPublicState(getString(body["decision"]));
  const message = getPublicMessage({
    action,
    body,
    decision,
    isError: getString(body["error"]) !== undefined,
    status,
  });

  if (getString(body["error"])) {
    return withDefinedValues({
      error: getString(body["error"]),
      refund_request_id: refundRequestId,
      status,
      decision,
      message,
    }) as RefundRequestErrorResponse;
  }

  const publicResponse = withDefinedValues({
    refund_request_id: refundRequestId,
    status: status ?? getOutcomeForAction(action),
    decision,
    outcome: getOutcomeForAction(action, status),
    review_url: refundRequestId
      ? `/app/refund-requests/${refundRequestId}`
      : undefined,
    message,
  });

  return action === "execute"
    ? (publicResponse as RefundRequestExecutionResponse)
    : (publicResponse as RefundRequestReviewResponse);
}

function getOutcomeForAction(
  action: RefundRequestAliasAction,
  status?: string,
): string {
  if (status === "failed") {
    return "failed";
  }

  if (action === "approve") {
    return "approved";
  }

  if (action === "reject") {
    return "rejected";
  }

  return "executed";
}

function getPublicMessage({
  action,
  body,
  decision,
  isError,
  status,
}: {
  action: RefundRequestAliasAction;
  body: JsonObject;
  decision: string | undefined;
  isError: boolean;
  status: string | undefined;
}): string {
  const existingMessage = getString(body["message"]);

  if (isError) {
    return existingMessage
      ? replaceInternalMessageTerms(existingMessage)
      : "Refund request could not be updated.";
  }

  if (action === "approve") {
    return "Refund approved.";
  }

  if (action === "reject") {
    return "Refund rejected.";
  }

  if (status === "failed" || decision === "failed") {
    return "Demo execution failed.";
  }

  if (existingMessage?.includes("Stripe test-mode refund completed")) {
    return "Stripe test-mode refund completed.";
  }

  return "Demo execution recorded.";
}

function mapPublicState(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "approval_required") {
    return "needs_review";
  }

  if (normalized === "allow" || normalized === "allowed") {
    return "allowed";
  }

  if (
    normalized === "deny" ||
    normalized === "denied" ||
    normalized === "blocked"
  ) {
    return "blocked";
  }

  if (normalized === "approved") {
    return "approved";
  }

  if (normalized === "rejected") {
    return "rejected";
  }

  if (normalized === "executed" || normalized === "succeeded") {
    return "executed";
  }

  if (normalized === "failed") {
    return "failed";
  }

  return normalized;
}

function replaceInternalMessageTerms(message: string): string {
  return message
    .replaceAll("Action request", "Refund request")
    .replaceAll("action requests", "refund requests")
    .replaceAll("action request", "refund request")
    .replaceAll("Denied refund requests", "Blocked refund requests")
    .replaceAll("denied refund requests", "blocked refund requests")
    .replaceAll("Dry-run execution completed.", "Demo execution recorded.");
}

function withDefinedValues(values: Record<string, JsonValue | undefined>) {
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, JsonValue] => {
      return entry[1] !== undefined;
    }),
  ) as JsonObject;
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getString(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function cleanString(value: string): string | undefined {
  return value.trim() ? value.trim() : undefined;
}
