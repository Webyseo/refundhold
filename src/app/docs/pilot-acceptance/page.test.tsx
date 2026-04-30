import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PilotAcceptancePage from "./page";

describe("pilot acceptance contract page", () => {
  it("renders the controlled pilot acceptance contract without claiming production readiness", () => {
    const html = renderToStaticMarkup(<PilotAcceptancePage />);

    expect(html).toContain("Pilot acceptance contract");
    expect(html).toContain(
      "What a controlled RefundHold test-mode pilot proves, what it does not prove, and how success is evaluated. Live refunds are blocked in v1.",
    );
    expect(html).toContain("What the pilot proves");
    expect(html).toContain("What the pilot does not prove");
    expect(html).toContain("It does not prove stable production webhooks.");
    expect(html).toContain("Pilot architecture responsibilities");
    expect(html).toContain("State matrix");
    expect(html).toContain("allowed");
    expect(html).toContain("needs_review");
    expect(html).toContain("approved");
    expect(html).toContain("rejected");
    expect(html).toContain("executed");
    expect(html).toContain("blocked");
    expect(html).toContain("failed");
    expect(html).toContain("Go if");
    expect(html).toContain("No-go if");
    expect(html).toContain("Evidence required in the pilot");
    expect(html).toContain("live refunds are blocked");
    expect(html).toContain("href=\"/docs/test-mode-pilot\"");
    expect(html).toContain("href=\"/docs/api\"");
    expect(html).toContain("href=\"/docs/stripe-test-mode\"");
    expect(html).toContain("href=\"/docs/prevent-bypass\"");
    expect(html).toContain("href=\"/demo/reviewer\"");
    expect(html).toContain("href=\"/docs/quickstart\"");
    expect(html).toContain("href=\"/contact\"");
    expect(html).not.toContain("Stripe-approved");
    expect(html).not.toContain("fully GDPR compliant");
    expect(html).not.toContain("production-ready live refunds");
    expect(html).not.toContain("stable webhook support");
  });
});
