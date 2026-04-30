import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import TestModePilotPage from "./page";

describe("test-mode pilot contract page", () => {
  it("renders the controlled pilot contract without claiming live readiness", () => {
    const html = renderToStaticMarkup(<TestModePilotPage />);

    expect(html).toContain("Test-mode pilot contract");
    expect(html).toContain(
      "The controlled contract for testing RefundHold with AI-generated Stripe refund proposals, human approval, and Stripe test objects. Live refunds are blocked in v1.",
    );
    expect(html).toContain("allowed");
    expect(html).toContain("needs_review");
    expect(html).toContain("blocked");
    expect(html).toContain("Approval versus execution");
    expect(html).toContain("Idempotency and retries");
    expect(html).toContain("Public idempotency keys are not yet part of the pilot contract.");
    expect(html).toContain("Webhook and polling contract");
    expect(html).toContain("Example only. Not a stable implemented webhook contract yet.");
    expect(html).toContain("refund_request.created");
    expect(html).toContain("refund_request.needs_review");
    expect(html).toContain("refund_request.approved");
    expect(html).toContain("refund_request.rejected");
    expect(html).toContain("refund_request.executed");
    expect(html).toContain("refund_request.failed");
    expect(html).toContain("href=\"/docs/test-mode-runbook\"");
    expect(html).toContain("href=\"/docs/api\"");
    expect(html).toContain("href=\"/docs/pilot-acceptance\"");
    expect(html).toContain("href=\"/docs/stripe-test-mode\"");
    expect(html).toContain("href=\"/docs/prevent-bypass\"");
    expect(html).toContain("href=\"/demo/reviewer\"");
    expect(html).toContain("href=\"/docs/quickstart\"");
    expect(html).toContain("href=\"/contact\"");
    expect(html).not.toContain("Stripe-approved");
    expect(html).not.toContain("fully GDPR compliant");
    expect(html).not.toContain("production-ready live refunds");
  });
});
