import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { StripeStatusContent } from "./page";

vi.mock("@/lib/stripe/config", () => ({
  getStripeSafetyConfig: () => ({
    testModeEnabled: false,
    testRefundsEnabled: false,
  }),
}));

describe("private Stripe status UI", () => {
  it("shows clear mode cards, current mode, and safe next actions", () => {
    const html = renderToStaticMarkup(<StripeStatusContent />);

    expect(html).toContain("Stripe test-mode");
    expect(html).toContain("Demo simulation");
    expect(html).toContain("Status: Available");
    expect(html).toContain("Status: Setup required");
    expect(html).toContain("Live refunds");
    expect(html).toContain("Status: Blocked");
    expect(html).toContain("You are using demo simulation.");
    expect(html).toContain("RefundHold does not call Stripe or move money");
    expect(html).toContain("href=\"/app/onboarding\"");
    expect(html).toContain("href=\"/app/refund-requests\"");
    expect(html).toContain("href=\"/docs/stripe-test-mode\"");
    expect(html).toContain("href=\"/docs/quickstart\"");
    expect(html).not.toContain("dry_run");
    expect(html).not.toContain("connector");
  });
});
