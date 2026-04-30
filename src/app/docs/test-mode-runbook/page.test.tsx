import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import TestModeRunbookPage from "./page";

describe("exact test-mode runbook page", () => {
  it("renders the exact controlled pilot runbook without claiming live readiness", () => {
    const html = renderToStaticMarkup(<TestModeRunbookPage />);

    expect(html).toContain("Exact test-mode runbook");
    expect(html).toContain(
      "A step-by-step script for running a controlled RefundHold pilot with Stripe test objects. Live refunds are blocked in v1.",
    );
    expect(html).toContain("What this runbook is");
    expect(html).toContain("Prerequisites");
    expect(html).toContain("Environment and settings");
    expect(html).toContain("Pilot safety rule");
    expect(html).toContain("Create a Stripe test object");
    expect(html).toContain("Demo simulation path");
    expect(html).toContain("Controlled Stripe test-mode path");
    expect(html).toContain("connector");
    expect(html).toContain("stripe_test");
    expect(html).toContain("stripe.payment_intent");
    expect(html).toContain("stripe.charge");
    expect(html).toContain("Expected create response");
    expect(html).toContain("refund_request_id");
    expect(html).toContain("needs_review");
    expect(html).toContain("POST /api/v1/refund-requests/[id]/approve");
    expect(html).toContain("POST /api/v1/refund-requests/[id]/reject");
    expect(html).toContain("POST /api/v1/refund-requests/[id]/execute");
    expect(html).toContain("Retry and idempotency rule for the pilot");
    expect(html).toContain("Public idempotency keys are not yet part of the pilot contract");
    expect(html).toContain("Webhook/callback rule for the pilot");
    expect(html).toContain("refund_request.created");
    expect(html).toContain("Error object examples");
    expect(html).toContain("missing API key");
    expect(html).toContain("invalid API key");
    expect(html).toContain("invalid payload");
    expect(html).toContain("not found");
    expect(html).toContain("execution not allowed");
    expect(html).toContain("live refunds blocked");
    expect(html).toContain("Pass/fail checklist");
    expect(html).toContain("live refunds are blocked in v1");
    expect(html).toContain("href=\"/docs/api\"");
    expect(html).toContain("href=\"/docs/test-mode-pilot\"");
    expect(html).toContain("href=\"/docs/pilot-acceptance\"");
    expect(html).toContain("href=\"/docs/stripe-test-mode\"");
    expect(html).toContain("href=\"/docs/prevent-bypass\"");
    expect(html).toContain("href=\"/demo/reviewer\"");
    expect(html).toContain("href=\"/contact\"");
    expect(html).not.toContain("Stripe-approved");
    expect(html).not.toContain("fully GDPR compliant");
    expect(html).not.toContain("production-ready live refunds");
    expect(html).not.toContain("stable webhook support");
  });
});
