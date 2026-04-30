import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import StripeTestModePage from "./page";

describe("Stripe test-mode setup page", () => {
  it("renders a controlled test-mode runbook without claiming live readiness", () => {
    const html = renderToStaticMarkup(<StripeTestModePage />);

    expect(html).toContain("Stripe test-mode setup");
    expect(html).toContain(
      "Test RefundHold with Stripe test objects only. Live refunds are blocked in v1.",
    );
    expect(html).toContain("Demo simulation does not call Stripe.");
    expect(html).toContain("Stripe test-mode uses Stripe test objects only.");
    expect(html).toContain("controlled test-mode pilots");
    expect(html).toContain("REFUNDHOLD_DEMO_AGENT_API_KEY");
    expect(html).toContain("AUTHRAIL_STRIPE_TEST_MODE_ENABLED");
    expect(html).toContain("connector");
    expect(html).toContain("stripe_test");
    expect(html).toContain("resource");
    expect(html).toContain("stripe.payment_intent");
    expect(html).toContain("Do not use live Stripe object IDs or live Stripe keys.");
    expect(html).toContain("For the public API contract and execution model, read the API reference before testing execution paths.");
    expect(html).toContain("Live Stripe key is not configured.");
    expect(html).toContain("href=\"/docs/api\"");
    expect(html).toContain("href=\"/docs/test-mode-pilot\"");
    expect(html).toContain("href=\"/demo/reviewer\"");
    expect(html).toContain("href=\"/docs/quickstart\"");
    expect(html).toContain("href=\"/docs/prevent-bypass\"");
    expect(html).toContain("href=\"/contact\"");
    expect(html).toContain("href=\"/security\"");
    expect(html).not.toContain("Stripe-approved");
    expect(html).not.toContain("fully GDPR compliant");
    expect(html).not.toContain("production-ready live refunds");
  });
});
