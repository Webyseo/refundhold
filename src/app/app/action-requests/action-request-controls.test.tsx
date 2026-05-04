import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ActionRequestControlsPanel } from "./action-request-controls";
import type { CurrentUserPermissions } from "@/lib/auth/current-user";

vi.mock("../actions", () => ({
  approveActionRequestFromDashboard: async () => undefined,
  rejectActionRequestFromDashboard: async () => undefined,
  executeActionRequestFromDashboard: async () => undefined,
}));

describe("ActionRequestControlsPanel", () => {
  it("shows read-only messaging instead of review actions for viewers", () => {
    const html = renderToStaticMarkup(
      <ActionRequestControlsPanel
        actionRequestId="ar_123"
        controls={{ canApprove: true, canReject: true, canExecute: false }}
        permissions={createPermissions({
          reviewActionRequests: false,
          executeRefunds: false,
        })}
        status="APPROVAL_REQUIRED"
        stripeTestRefund={null}
      />,
    );

    expect(html).toContain("You have read-only access.");
    expect(html).toContain("Reviewer permission required.");
    expect(html).not.toContain("Approve refund");
    expect(html).not.toContain("Reject refund");
    expect(html).not.toContain("Record demo execution");
  });

  it("shows review actions for reviewers when the request state allows review", () => {
    const html = renderToStaticMarkup(
      <ActionRequestControlsPanel
        actionRequestId="ar_123"
        controls={{ canApprove: true, canReject: true, canExecute: false }}
        permissions={createPermissions()}
        status="APPROVAL_REQUIRED"
        stripeTestRefund={null}
      />,
    );

    expect(html).toContain("Decision needed");
    expect(html).toContain(
      "Approve this refund only if the customer should receive the money back.",
    );
    expect(html).toContain("Approve refund");
    expect(html).toContain("Reject refund");
    expect(html).not.toContain("You have read-only access.");
  });

  it("shows demo execution for reviewers when the request is approved", () => {
    const html = renderToStaticMarkup(
      <ActionRequestControlsPanel
        actionRequestId="ar_123"
        controls={{ canApprove: false, canReject: false, canExecute: true }}
        permissions={createPermissions()}
        status="APPROVED"
        stripeTestRefund={null}
      />,
    );

    expect(html).toContain("The reviewer approved this refund for demo simulation.");
    expect(html).toContain("Record demo execution");
    expect(html).not.toContain("Reviewer permission required.");
  });
});

function createPermissions(
  overrides: Partial<CurrentUserPermissions> = {},
): CurrentUserPermissions {
  return {
    viewDashboard: true,
    reviewActionRequests: true,
    executeRefunds: true,
    managePolicies: false,
    manageConnectors: false,
    manageMembers: false,
    ...overrides,
  };
}
