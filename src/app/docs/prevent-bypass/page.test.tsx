import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PreventBypassPage from "./page";

describe("prevent bypass docs page", () => {
  it("explains the safe approval boundary without overclaiming enforcement", () => {
    const html = renderToStaticMarkup(<PreventBypassPage />);

    expect(html).toContain("Preventing AI refund bypass");
    expect(html).toContain(
      "Keep Stripe refund capability out of the AI agent. Let the agent propose refunds to RefundHold, then require policy or human approval before anything can continue.",
    );
    expect(html).toContain(
      "The AI support agent should never receive Stripe secret keys or direct refund permissions.",
    );
    expect(html).toContain(
      "If an AI agent already has a live Stripe secret key, RefundHold cannot prevent that agent from bypassing RefundHold.",
    );
    expect(html).toContain("trusted execution boundary");
    expect(html).toContain("approval boundary");
    expect(html).toContain("The API reference documents the current execution model, decision values, and retry limits for pilots.");
    expect(html).toContain("Live refunds are blocked in v1.");
    expect(html).toContain("href=\"/docs/api\"");
    expect(html).toContain("href=\"/docs/test-mode-pilot\"");
    expect(html).toContain("href=\"/docs/stripe-test-mode\"");
    expect(html).toContain("href=\"/demo/reviewer\"");
    expect(html).toContain("href=\"/security\"");
    expect(html).toContain("href=\"/contact\"");
    expect(html).not.toContain("AuthRail");
    expect(html).not.toContain("ActionRequest");
    expect(html).not.toContain("control layer");
    expect(html).not.toContain("Stripe-approved");
    expect(html).not.toContain("fully GDPR compliant");
    expect(html).not.toContain("prevents all fraud");
    expect(html).not.toContain("enterprise-grade security");
    expect(html).not.toContain("production-ready live refunds");
  });
});
