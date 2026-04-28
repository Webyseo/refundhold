import { describe, expect, it } from "vitest";

import {
  canExecuteRefunds,
  canManageConnectors,
  canManageMembers,
  canManagePolicies,
  canReviewActionRequests,
  canViewDashboard,
  isMembershipRole,
  type MembershipRole,
} from "./rbac";

describe("RBAC permission helpers", () => {
  it("allows owners to perform every human reviewer and admin action", () => {
    expectPermissions("OWNER", {
      viewDashboard: true,
      reviewActionRequests: true,
      executeRefunds: true,
      managePolicies: true,
      manageConnectors: true,
      manageMembers: true,
    });
  });

  it("allows admins to manage refund controls but not organization members", () => {
    expectPermissions("ADMIN", {
      viewDashboard: true,
      reviewActionRequests: true,
      executeRefunds: true,
      managePolicies: true,
      manageConnectors: true,
      manageMembers: false,
    });
  });

  it("allows reviewers to review and execute approved refunds only", () => {
    expectPermissions("REVIEWER", {
      viewDashboard: true,
      reviewActionRequests: true,
      executeRefunds: true,
      managePolicies: false,
      manageConnectors: false,
      manageMembers: false,
    });
  });

  it("limits viewers to read-only dashboard access", () => {
    expectPermissions("VIEWER", {
      viewDashboard: true,
      reviewActionRequests: false,
      executeRefunds: false,
      managePolicies: false,
      manageConnectors: false,
      manageMembers: false,
    });
  });

  it("does not treat agent API key identities as membership roles", () => {
    expect(isMembershipRole("OWNER")).toBe(true);
    expect(isMembershipRole("AGENT_API_KEY")).toBe(false);
    expect(isMembershipRole("")).toBe(false);
    expect(isMembershipRole(null)).toBe(false);
  });
});

function expectPermissions(
  role: MembershipRole,
  expected: {
    viewDashboard: boolean;
    reviewActionRequests: boolean;
    executeRefunds: boolean;
    managePolicies: boolean;
    manageConnectors: boolean;
    manageMembers: boolean;
  },
) {
  expect(canViewDashboard(role)).toBe(expected.viewDashboard);
  expect(canReviewActionRequests(role)).toBe(expected.reviewActionRequests);
  expect(canExecuteRefunds(role)).toBe(expected.executeRefunds);
  expect(canManagePolicies(role)).toBe(expected.managePolicies);
  expect(canManageConnectors(role)).toBe(expected.manageConnectors);
  expect(canManageMembers(role)).toBe(expected.manageMembers);
}
