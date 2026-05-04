import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OnboardingContent } from "./page";

describe("private onboarding UI", () => {
  it("guides the demo setup without making localhost curl the primary path", () => {
    const html = renderToStaticMarkup(<OnboardingContent rulesSelected />);

    expect(html).toContain("Choose mode");
    expect(html).toContain("Demo simulation");
    expect(html).toContain("Stripe test-mode");
    expect(html).toContain("Live refunds are blocked in v1.");
    expect(html).toContain("Confirm refund rules");
    expect(html).toContain("Use these rules");
    expect(html).toContain("aria-live=\"polite\"");
    expect(html).toContain("Demo rules selected.");
    expect(html).toContain(
      "sample refund requests are already available in the reviewer queue",
    );
    expect(html).toContain("href=\"/app/refund-requests\"");
    expect(html).toContain("Developer API example");
    expect(html).toContain("https://refundhold.com/api/v1/refund-requests");
    expect(html).not.toContain("curl -X POST http://localhost:3000");
    expect(html).not.toContain("AUTHRAIL_");
    expect(html).not.toContain("dry_run");
  });
});
