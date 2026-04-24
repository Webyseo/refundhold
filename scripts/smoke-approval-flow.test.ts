import { describe, expect, it } from "vitest";

import {
  buildApprovalReviewRequest,
  buildReviewableRefundRequest,
  defaultDemoReviewerEmail,
} from "./smoke-approval-flow";

describe("approval flow smoke test helpers", () => {
  it("builds a reviewable refund action request", () => {
    expect(buildReviewableRefundRequest("first")).toEqual({
      connector: "stripe_test",
      action: "refund.create",
      resource: {
        refund_id: "approval_flow_refund_first",
      },
      parameters: {
        amount: 100,
        currency: "EUR",
      },
      context: {
        source: "local_e2e_approval_flow",
      },
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
        "x-authrail-reviewer-email": "reviewer@authrail.local",
      },
      body: JSON.stringify({
        comment: "Approved by smoke.",
      }),
    });
  });
});
