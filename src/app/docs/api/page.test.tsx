import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ApiDocsPage from "./page";

describe("api docs page", () => {
  it("renders public RefundHold refund proposal API guidance", () => {
    const html = renderToStaticMarkup(<ApiDocsPage />);

    expect(html).toContain("API reference");
    expect(html).toContain("/api/v1/refund-requests");
    expect(html).toContain("allowed, needs_review, or blocked");
    expect(html).toContain("Live refunds are blocked in v1.");
    expect(html).toContain("href=\"/demo/reviewer\"");
    expect(html).toContain("href=\"/docs/test-mode-runbook\"");
    expect(html).toContain("href=\"/docs/pilot-acceptance\"");
    expect(html).toContain("href=\"/docs/test-mode-pilot\"");
    expect(html).toContain("href=\"/docs/stripe-test-mode\"");
    expect(html).toContain("href=\"/docs/prevent-bypass\"");
    expect(html).not.toContain("AuthRail");
    expect(html).not.toContain("Stripe-approved");
  });

  it("documents decision values, execution, errors, and agent behavior", () => {
    const html = renderToStaticMarkup(<ApiDocsPage />);

    expect(html).toContain("Decision values");
    expect(html).toContain("allowed");
    expect(html).toContain("needs_review");
    expect(html).toContain("blocked");
    expect(html).toContain("Execution model");
    expect(html).toContain("Demo simulation: RefundHold records the decision and demo execution evidence. No Stripe call is made.");
    expect(html).toContain("Error responses");
    expect(html).toContain("missing API key");
    expect(html).toContain("invalid API key");
    expect(html).toContain("invalid payload");
    expect(html).toContain("Idempotency and retries");
    expect(html).toContain("not yet part of the public pilot contract");
    expect(html).toContain("Polling, webhooks, and waiting for human review");
    expect(html).toContain("Agent behavior guide");
    expect(html).toContain("You are allowed to recommend refunds, but you must not call Stripe directly.");
    expect(html).toContain("POST /api/v1/refund-requests/[id]/approve");
    expect(html).toContain("POST /api/v1/refund-requests/[id]/reject");
    expect(html).toContain("POST /api/v1/refund-requests/[id]/execute");
    expect(html).toContain("href=\"/docs/quickstart\"");
    expect(html).toContain("href=\"/docs/test-mode-runbook\"");
    expect(html).toContain("href=\"/docs/test-mode-pilot\"");
    expect(html).toContain("href=\"/contact\"");
  });
});
