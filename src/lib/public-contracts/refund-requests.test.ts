import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { toRefundRequestBody } from "@/app/api/v1/refund-requests/refund-response";

import type {
  RefundDecision,
  RefundMode,
  RefundRequestCreateInput,
  RefundRequestCreateResponse,
  RefundRequestErrorResponse,
  RefundRequestExecutionResponse,
  RefundRequestPublicResponse,
  RefundRequestReviewResponse,
  RefundStatus,
} from "./refund-requests";

const contractSource = readFileSync(
  new URL("./refund-requests.ts", import.meta.url),
  "utf8",
);

describe("public refund request contracts", () => {
  it("exports public RefundHold refund request type names", () => {
    const exportedTypeNames = Array.from(
      contractSource.matchAll(/^export type (\w+)/gm),
      (match) => match[1],
    );

    expect(exportedTypeNames).toEqual(
      expect.arrayContaining([
        "RefundDecision",
        "RefundStatus",
        "RefundMode",
        "RefundRequestCreateInput",
        "RefundRequestCreateResponse",
        "RefundRequestReviewResponse",
        "RefundRequestExecutionResponse",
        "RefundRequestErrorResponse",
        "RefundRequestPublicResponse",
      ]),
    );
  });

  it("does not expose legacy names in the public contract source", () => {
    expect(contractSource).not.toMatch(/ActionRequest/);
    expect(contractSource).not.toMatch(/action_request_id/);
    expect(contractSource).not.toMatch(/AuthRail/);
    expect(contractSource).not.toMatch(/AUTHRAIL_/);
    expect(contractSource).not.toMatch(/\bconnector\b/);
    expect(contractSource).not.toMatch(/dry_run/);
  });

  it("defines public decisions, statuses, and modes", () => {
    const allowed = "allowed" satisfies RefundDecision;
    const needsReview = "needs_review" satisfies RefundDecision;
    const blocked = "blocked" satisfies RefundDecision;
    const executed = "executed" satisfies RefundStatus;
    const failed = "failed" satisfies RefundStatus;
    const demoSimulation = "demo_simulation" satisfies RefundMode;
    const stripeTestMode = "stripe_test_mode" satisfies RefundMode;

    expect([
      allowed,
      needsReview,
      blocked,
      executed,
      failed,
      demoSimulation,
      stripeTestMode,
    ]).toEqual([
      "allowed",
      "needs_review",
      "blocked",
      "executed",
      "failed",
      "demo_simulation",
      "stripe_test_mode",
    ]);
  });

  it("types the public create request and response fields", () => {
    const input = {
      stripe_mode: "demo_simulation",
      amount: 42000,
      currency: "usd",
      reason: "AI support agent recommends a refund.",
    } satisfies RefundRequestCreateInput;
    const response = {
      refund_request_id: "rr_123",
      decision: "needs_review",
      reason: "Human approval required for refunds between $50 and $500",
      review_url: "/app/refund-requests/rr_123",
    } satisfies RefundRequestCreateResponse;

    expect(input.stripe_mode).toBe("demo_simulation");
    expect(response).toEqual({
      refund_request_id: "rr_123",
      decision: "needs_review",
      reason: "Human approval required for refunds between $50 and $500",
      review_url: "/app/refund-requests/rr_123",
    });
  });

  it("types approve, reject, execute, and error response fields", () => {
    const approved = {
      refund_request_id: "rr_123",
      status: "approved",
      decision: "approved",
      outcome: "approved",
      review_url: "/app/refund-requests/rr_123",
      message: "Refund approved.",
    } satisfies RefundRequestReviewResponse;
    const rejected = {
      refund_request_id: "rr_123",
      status: "rejected",
      decision: "rejected",
      outcome: "rejected",
      review_url: "/app/refund-requests/rr_123",
      message: "Refund rejected.",
    } satisfies RefundRequestReviewResponse;
    const executed = {
      refund_request_id: "rr_123",
      status: "executed",
      outcome: "executed",
      review_url: "/app/refund-requests/rr_123",
      message: "Demo execution recorded.",
    } satisfies RefundRequestExecutionResponse;
    const error = {
      error: "not_executable",
      refund_request_id: "rr_123",
      message: "Blocked refund requests cannot be executed.",
    } satisfies RefundRequestErrorResponse;

    expect([approved.outcome, rejected.outcome, executed.outcome]).toEqual([
      "approved",
      "rejected",
      "executed",
    ]);
    expect(error.message).not.toMatch(/live money/i);
  });

  it("types the refund response mapper with public response contracts", () => {
    const approved: RefundRequestPublicResponse = toRefundRequestBody(
      {
        action_request_id: "rr_123",
        status: "APPROVED",
        decision: "approved",
        reason: "Action request approved.",
      },
      {
        action: "approve",
        fallbackId: "rr_123",
      },
    );
    const executed: RefundRequestPublicResponse = toRefundRequestBody(
      {
        action_request_id: "rr_123",
        status: "SUCCEEDED",
        execution_mode: "dry_run",
        message: "Dry-run execution completed.",
      },
      {
        action: "execute",
        fallbackId: "rr_123",
      },
    );

    expect(approved).toEqual({
      refund_request_id: "rr_123",
      status: "approved",
      decision: "approved",
      outcome: "approved",
      review_url: "/app/refund-requests/rr_123",
      message: "Refund approved.",
    });
    expect(executed).toEqual({
      refund_request_id: "rr_123",
      status: "executed",
      outcome: "executed",
      review_url: "/app/refund-requests/rr_123",
      message: "Demo execution recorded.",
    });
    expect(JSON.stringify([approved, executed])).not.toMatch(/live money/i);
  });
});
