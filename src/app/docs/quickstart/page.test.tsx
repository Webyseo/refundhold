import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import QuickstartPage from "./page";

describe("quickstart page", () => {
  it("links technical pilots to the Stripe test-mode runbook", () => {
    const html = renderToStaticMarkup(<QuickstartPage />);

    expect(html).toContain("5-minute setup");
    expect(html).toContain("href=\"/docs/stripe-test-mode\"");
    expect(html).toContain("href=\"/docs/prevent-bypass\"");
    expect(html).toContain("Stripe test-mode setup");
    expect(html).not.toContain("Stripe-approved");
  });
});
