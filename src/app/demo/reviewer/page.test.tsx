import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ReviewerDemoPage from "./page";

describe("public reviewer demo page", () => {
  it("renders a public read-only reviewer dashboard with curated refund evidence", () => {
    const html = renderToStaticMarkup(<ReviewerDemoPage />);

    expect(html).toContain("Reviewer dashboard demo");
    expect(html).toContain("Read-only demo");
    expect(html).toContain("No login required. No Stripe calls.");
    expect(html).toContain("customer-042@example.test");
    expect(html).toContain("demo-refund-420");
    expect(html).toContain("$50-$500 -&gt; human approval required");
    expect(html).toContain("Demo simulation");
    expect(html).toContain("Stripe test-mode");
    expect(html).toContain("href=\"/demo\"");
    expect(html).toContain("href=\"/docs/api\"");
    expect(html).toContain("href=\"/docs/quickstart\"");
    expect(html).toContain("href=\"/contact\"");
    expect(html).not.toContain("AuthRail");
    expect(html).not.toContain("ActionRequest");
    expect(html).not.toContain("dry_run");
    expect(html).not.toContain("stripe_test");
  });
});
