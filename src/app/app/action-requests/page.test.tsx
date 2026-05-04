import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  RefundRequestsEmptyState,
  getEffectiveRequestFilter,
  getShortNextActionLabel,
  refundRequestFilters,
} from "./page";

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
    expect(html).toContain("Create a demo request or read the API quickstart.");
    expect(html).toContain("href=\"/app/onboarding\"");
    expect(html).toContain("Create demo refund request");
    expect(html).toContain("href=\"/docs/quickstart\"");
    expect(html).toContain("View API quickstart");
    expect(html).not.toContain("hosted demo seed");
    expect(html).not.toContain("ActionRequest");
    expect(html).not.toContain("/app/action-requests");
  });

  it("shows a contextual empty state when the selected filter has no rows", () => {
    const html = renderToStaticMarkup(
      <RefundRequestsEmptyState
        hasAnyRequests
        routeBase="/app/refund-requests"
        selectedFilter="approved"
      />,
    );

    expect(html).toContain("No refunds match this filter");
    expect(html).toContain("Switch to All to see every demo request.");
    expect(html).toContain("href=\"/app/refund-requests\"");
    expect(html).toContain("Show all refund requests");
    expect(html).not.toContain("Start demo refund");
  });

  it("defaults to needs review only when pending requests exist", () => {
    expect(
      getEffectiveRequestFilter({
        requestedFilter: null,
        counts: {
          all: 2,
          pending: 1,
          approved: 1,
          rejected: 0,
          executed: 0,
          failed: 0,
        },
      }),
    ).toBe("pending");

    expect(
      getEffectiveRequestFilter({
        requestedFilter: null,
        counts: {
          all: 2,
          pending: 0,
          approved: 1,
          rejected: 1,
          executed: 0,
          failed: 0,
        },
      }),
    ).toBe("all");

    expect(
      getEffectiveRequestFilter({
        requestedFilter: "rejected",
        counts: {
          all: 2,
          pending: 1,
          approved: 0,
          rejected: 1,
          executed: 0,
          failed: 0,
        },
      }),
    ).toBe("rejected");
  });

  it("uses short next-action labels for queue rows", () => {
    expect(
      getShortNextActionLabel({
        decision: "APPROVAL_REQUIRED",
        status: "APPROVAL_REQUIRED",
      }),
    ).toBe("Review required");
    expect(
      getShortNextActionLabel({
        decision: "APPROVAL_REQUIRED",
        status: "APPROVED",
      }),
    ).toBe("Ready to record execution");
    expect(
      getShortNextActionLabel({
        decision: "APPROVAL_REQUIRED",
        status: "REJECTED",
      }),
    ).toBe("Rejected - no action");
    expect(
      getShortNextActionLabel({
        decision: "APPROVAL_REQUIRED",
        status: "EXECUTED",
      }),
    ).toBe("Executed - audit available");
  });
});
