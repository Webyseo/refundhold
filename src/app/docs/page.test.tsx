import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DocsIndexPage from "./page";

describe("docs index page", () => {
  it("renders grouped RefundHold documentation links", () => {
    const html = renderToStaticMarkup(<DocsIndexPage />);

    expect(html).toContain("RefundHold docs");
    expect(html).toContain(
      "Start with the demo, then use the API, test-mode runbook, and pilot contracts to evaluate a controlled Stripe test-mode pilot.",
    );
    expect(html).toContain("Start");
    expect(html).toContain("href=\"/docs/quickstart\"");
    expect(html).toContain("href=\"/docs/api\"");
    expect(html).toContain("href=\"/docs/test-mode-runbook\"");
    expect(html).toContain("Pilot");
    expect(html).toContain("href=\"/docs/test-mode-pilot\"");
    expect(html).toContain("href=\"/docs/pilot-acceptance\"");
    expect(html).toContain("href=\"/docs/stripe-test-mode\"");
    expect(html).toContain("Security");
    expect(html).toContain("href=\"/docs/prevent-bypass\"");
    expect(html).toContain("href=\"/security\"");
    expect(html).toContain("href=\"/privacy\"");
    expect(html).toContain("href=\"/terms\"");
    expect(html).toContain("Demo");
    expect(html).toContain("href=\"/demo\"");
    expect(html).toContain("href=\"/demo/reviewer\"");
  });
});
