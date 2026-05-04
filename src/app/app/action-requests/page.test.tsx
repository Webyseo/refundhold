import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RefundRequestsEmptyState, refundRequestFilters } from "./page";

describe("refund requests queue UI", () => {
  it("uses refund request language, public CTAs, and the expected filters", () => {
    expect(refundRequestFilters.map((filter) => filter.label)).toEqual([
      "All",
      "Needs review",
      "Approved",
      "Rejected",
      "Executed",
      "Failed",
    ]);

    const html = renderToStaticMarkup(<RefundRequestsEmptyState />);

    expect(html).toContain("No refund requests yet");
    expect(html).toContain(
      "Send a test refund request from your AI agent or start with the demo flow.",
    );
    expect(html).toContain("href=\"/demo\"");
    expect(html).toContain("Start demo refund");
    expect(html).toContain("href=\"/docs/quickstart\"");
    expect(html).toContain("View API quickstart");
    expect(html).not.toContain("hosted demo seed");
    expect(html).not.toContain("ActionRequest");
    expect(html).not.toContain("/app/action-requests");
  });
});
