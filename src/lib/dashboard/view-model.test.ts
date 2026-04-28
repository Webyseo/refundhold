import { describe, expect, it } from "vitest";

import {
  filterActionRequestsByDashboardStatus,
  getActionRequestControls,
  getAmountCurrency,
  getDemoReviewerDisplayName,
  getImpactSummary,
  getNextSafeAction,
  getRequestFilterCounts,
  sortDashboardActionRequestsForReview,
  type DashboardActionRequestState,
  type DashboardActionRequestSummary,
} from "./view-model";

describe("dashboard view model", () => {
  it("extracts amount and currency from request parameters", () => {
    expect(
      getAmountCurrency({
        amount: 100,
        currency: "USD",
      }),
    ).toEqual({
      amount: "100",
      currency: "USD",
    });
  });

  it("ignores malformed amount and currency parameters", () => {
    expect(
      getAmountCurrency({
        amount: "100",
        currency: 123,
      }),
    ).toEqual({
      amount: null,
      currency: null,
    });
  });

  it("shows approve and reject only for pending approval requests", () => {
    expect(
      getActionRequestControls({
        decision: "APPROVAL_REQUIRED",
        status: "APPROVAL_REQUIRED",
      }),
    ).toEqual({
      canApprove: true,
      canReject: true,
      canExecute: false,
    });
  });

  it("shows execute only for approved requests", () => {
    expect(
      getActionRequestControls({
        decision: "APPROVAL_REQUIRED",
        status: "APPROVED",
      }),
    ).toEqual({
      canApprove: false,
      canReject: false,
      canExecute: true,
    });
  });

  it("does not show actions for terminal requests", () => {
    const terminalStates = [
      {
        decision: "DENY",
        status: "DENIED",
      },
      {
        decision: "APPROVAL_REQUIRED",
        status: "REJECTED",
      },
      {
        decision: "APPROVAL_REQUIRED",
        status: "EXECUTED",
      },
    ] satisfies DashboardActionRequestState[];

    for (const state of terminalStates) {
      expect(getActionRequestControls(state)).toEqual({
        canApprove: false,
        canReject: false,
        canExecute: false,
      });
    }
  });

  it("builds a concise impact summary from amount and currency", () => {
    expect(
      getImpactSummary({
        operation: "refund.create",
        parameters: {
          amount: 100,
          currency: "usd",
        },
      }),
    ).toBe("100 USD refund.create");
  });

  it("falls back to the operation when no amount is available", () => {
    expect(
      getImpactSummary({
        operation: "refund.create",
        parameters: {},
      }),
    ).toBe("refund.create");
  });

  it("counts dashboard filters from request status", () => {
    const requests = [
      makeRequest("pending", "APPROVAL_REQUIRED"),
      makeRequest("approved", "APPROVED"),
      makeRequest("rejected", "REJECTED"),
      makeRequest("executed", "EXECUTED"),
    ];

    expect(getRequestFilterCounts(requests)).toEqual({
      all: 4,
      pending: 1,
      approved: 1,
      rejected: 1,
      executed: 1,
    });
  });

  it("filters action requests by dashboard status", () => {
    const requests = [
      makeRequest("pending", "APPROVAL_REQUIRED"),
      makeRequest("approved", "APPROVED"),
      makeRequest("denied", "DENIED"),
    ];

    expect(
      filterActionRequestsByDashboardStatus(requests, "pending").map(
        (request) => request.id,
      ),
    ).toEqual(["pending"]);

    expect(
      filterActionRequestsByDashboardStatus(requests, "all").map(
        (request) => request.id,
      ),
    ).toEqual(["pending", "approved", "denied"]);
  });

  it("sorts pending review requests before terminal requests and keeps newest first", () => {
    const requests = [
      makeRequest("old-pending", "APPROVAL_REQUIRED", new Date("2026-01-01")),
      makeRequest("new-executed", "EXECUTED", new Date("2026-01-04")),
      makeRequest("new-pending", "APPROVAL_REQUIRED", new Date("2026-01-03")),
      makeRequest("old-executed", "EXECUTED", new Date("2026-01-02")),
    ];

    expect(
      sortDashboardActionRequestsForReview(requests).map((request) => request.id),
    ).toEqual(["new-pending", "old-pending", "new-executed", "old-executed"]);
  });

  it("uses a clean demo reviewer display name instead of internal emails", () => {
    expect(
      getDemoReviewerDisplayName({
        displayName: "RefundHold Demo Reviewer",
        email: "legacy.reviewer@example.internal",
      }),
    ).toBe("RefundHold Demo Reviewer");

    expect(
      getDemoReviewerDisplayName({
        displayName: null,
        email: "legacy.reviewer@example.internal",
      }),
    ).toBe("Demo Reviewer");
  });

  it("explains the next safe action for demo refund states", () => {
    expect(
      getNextSafeAction({
        decision: "APPROVAL_REQUIRED",
        status: "APPROVAL_REQUIRED",
      }),
    ).toBe("Review evidence, then approve or reject before any dry_run execution.");

    expect(
      getNextSafeAction({
        decision: "APPROVAL_REQUIRED",
        status: "APPROVED",
      }),
    ).toBe("Run the dry_run execution simulation; no Stripe API call is made.");

    expect(
      getNextSafeAction({
        decision: "DENY",
        status: "DENIED",
      }),
    ).toBe("No execution is available because policy blocked the refund.");
  });
});

function makeRequest(
  id: string,
  status: DashboardActionRequestSummary["status"],
  createdAt = new Date("2026-01-01"),
): DashboardActionRequestSummary {
  return {
    id,
    status,
    decision: status === "DENIED" ? "DENY" : "APPROVAL_REQUIRED",
    createdAt,
    operation: "refund.create",
    parameters: {
      amount: 100,
      currency: "USD",
    },
  };
}
