import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildApprovalReviewRequest,
  buildReviewableRefundRequest,
  defaultDemoReviewerEmail,
  runApprovalFlowSmokeTest,
} from "./smoke-approval-flow";

describe("approval flow smoke test helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("builds a reviewable public refund request", () => {
    expect(buildReviewableRefundRequest("first")).toEqual({
      stripe_mode: "demo_simulation",
      amount: 10000,
      currency: "usd",
      reason: "AI support agent recommends a test refund for approval flow first.",
    });
  });

  it("builds reviewer requests with the demo reviewer header", () => {
    expect(
      buildApprovalReviewRequest({
        reviewerEmail: defaultDemoReviewerEmail,
        comment: "Approved by smoke.",
      }),
    ).toEqual({
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-refundhold-reviewer-email": "demo.reviewer@refundhold.com",
      },
      body: JSON.stringify({
        comment: "Approved by smoke.",
      }),
    });
  });

  it("uses public refund-request endpoints and public response fields", async () => {
    let nextRefundRequestId = 1;
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://localhost:3000/api/v1/refund-requests") {
        const refundRequestId = `rr_review_${nextRefundRequestId}`;
        nextRefundRequestId += 1;

        return Response.json(
          {
            refund_request_id: refundRequestId,
            decision: "needs_review",
            reason: "Human approval required for refunds between $50 and $500",
            review_url: `/app/refund-requests/${refundRequestId}`,
          },
          { status: 201 },
        );
      }

      if (url.endsWith("/approve")) {
        return Response.json(
          {
            refund_request_id: "rr_review_1",
            status: "approved",
            decision: "approved",
            outcome: "approved",
            review_url: "/app/refund-requests/rr_review_1",
            message: "Refund approved.",
          },
          { status: 200 },
        );
      }

      return Response.json(
        {
          refund_request_id: "rr_review_2",
          status: "rejected",
          decision: "rejected",
          outcome: "rejected",
          review_url: "/app/refund-requests/rr_review_2",
          message: "Refund rejected.",
        },
        { status: 200 },
      );
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", fetchMock);

    await runApprovalFlowSmokeTest({
      baseUrl: "http://localhost:3000",
      apiKey: "ar_demo_prefix_secret",
      reviewerEmail: defaultDemoReviewerEmail,
    });

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "http://localhost:3000/api/v1/refund-requests",
      "http://localhost:3000/api/v1/refund-requests/rr_review_1/approve",
      "http://localhost:3000/api/v1/refund-requests",
      "http://localhost:3000/api/v1/refund-requests/rr_review_2/reject",
    ]);

    const output = logSpy.mock.calls.flat().join("\n");
    expect(output).toContain("approve refund request rr_review_1 -> approved");
    expect(output).toContain("reject refund request rr_review_2 -> rejected");
    expect(output).not.toContain("/api/v1/action-requests");
    expect(output).not.toContain("action request");
    expect(output).not.toContain("action_request_id");
    expect(output).not.toContain("dry_run");
    expect(output).not.toContain("connector");
  });
});
