import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ApiDocsPage from "./page";

describe("api docs page", () => {
  it("renders public RefundHold refund proposal API guidance", () => {
    const html = renderToStaticMarkup(<ApiDocsPage />);

    expect(html).toContain("RefundHold API docs");
    expect(html).toContain("/api/v1/refund-requests");
    expect(html).toContain("allowed, needs review, or blocked");
    expect(html).toContain("Live refunds are blocked in v1.");
    expect(html).toContain("href=\"/demo/reviewer\"");
    expect(html).toContain("href=\"/docs/stripe-test-mode\"");
    expect(html).toContain("href=\"/docs/prevent-bypass\"");
    expect(html).not.toContain("AuthRail");
    expect(html).not.toContain("Stripe-approved");
  });
});
