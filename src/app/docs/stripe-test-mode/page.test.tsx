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
    expect(html).toContain("Use the private demo agent API key");
    expect(html).toContain(
      "Enable Stripe test-mode only in the controlled pilot environment.",
    );
    expect(html).toContain("controlled Stripe test-mode payload");
    expect(html).toContain("Do not use live Stripe object IDs or live Stripe keys.");
    expect(html).toContain("For the public API contract and execution model, read the API reference before testing execution paths.");
    expect(html).toContain("Live Stripe key is not configured.");
    expect(html).toContain("href=\"/docs/test-mode-runbook\"");
    expect(html).toContain("href=\"/docs/api\"");
    expect(html).toContain("href=\"/docs/pilot-acceptance\"");
    expect(html).toContain("href=\"/docs/test-mode-pilot\"");
    expect(html).toContain("href=\"/demo/reviewer\"");
    expect(html).toContain("href=\"/docs/quickstart\"");
    expect(html).toContain("href=\"/docs/prevent-bypass\"");
    expect(html).toContain("href=\"/contact\"");
    expect(html).toContain("href=\"/security\"");
    expect(html).not.toContain("Stripe-approved");
    expect(html).not.toContain("fully GDPR compliant");
    expect(html).not.toContain("production-ready live refunds");
    expect(html).not.toContain("AUTHRAIL_");
    expect(html).not.toContain("connector");
    expect(html).not.toContain("stripe_test");
  });
});
