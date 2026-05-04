import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAppAccessContext } from "@/lib/auth/app-access";
import { getDashboardActionRequest } from "@/lib/dashboard/data";

import { RefundRequestDetailPage } from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/auth/app-access", () => ({
  getAppAccessContext: vi.fn(),
}));

vi.mock("@/lib/dashboard/data", () => ({
  getDashboardActionRequest: vi.fn(),
}));

describe("refund request detail UI", () => {
  beforeEach(() => {
    vi.mocked(getAppAccessContext).mockResolvedValue({
      ok: true,
      context: {
        authRequired: false,
        authEnabled: false,
        authUserId: null,
        displayName: "Demo Reviewer",
        domainUserId: "user_demo",
        email: "demo.reviewer@refundhold.com",
        mode: "demo",
        organizationId: "org_demo",
        organizationName: "RefundHold Demo",
        permissions: {
          executeRefunds: true,
          manageConnectors: false,
          manageMembers: false,
          managePolicies: false,
          reviewActionRequests: true,
          viewDashboard: true,
        },
        role: "REVIEWER",
        source: "demo",
      },
    });
    vi.mocked(getDashboardActionRequest).mockResolvedValue(makeRequest());
  });

  it("orders the page around reviewer decision, status, audit, and collapsed developer details", async () => {
    const html = renderToStaticMarkup(
      await RefundRequestDetailPage({
        params: Promise.resolve({ id: "demo-refund-420" }),
        searchParams: Promise.resolve({}),
        routeBase: "/app/refund-requests",
      }),
    );

    const summaryIndex = html.indexOf("Summary");
    const decisionIndex = html.indexOf("Decision needed");
    const policyIndex = html.indexOf("Policy matched");
    const statusIndex = html.indexOf("Current status");
    const auditIndex = html.indexOf("Audit trail");
    const developerIndex = html.indexOf("Developer details");

    expect(summaryIndex).toBeGreaterThan(-1);
    expect(decisionIndex).toBeGreaterThan(summaryIndex);
    expect(policyIndex).toBeGreaterThan(decisionIndex);
    expect(statusIndex).toBeGreaterThan(policyIndex);
    expect(auditIndex).toBeGreaterThan(statusIndex);
    expect(developerIndex).toBeGreaterThan(auditIndex);
    expect(html).toContain("AI support agent proposed a $420.00 USD Stripe refund.");
    expect(html).toContain("Approve this refund only if the customer should receive");
    expect(html).toContain("Reject it if the AI recommendation is wrong");
    expect(html).toContain("Human approval required");
    expect(html).toContain("Waiting for human approval");
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
    expect(html).not.toContain("ActionRequest");
    expect(html).not.toContain("AuthRail");
  });
});

function makeRequest() {
  const createdAt = new Date("2026-01-01T09:00:00.000Z");

  return {
    id: "demo-refund-420",
    organizationId: "org_demo",
    agentId: "agent_demo",
    connectorId: null,
    operation: "refund.create",
    resource: {
      type: "stripe_refund",
    },
    parameters: {
      amount: 420,
      currency: "usd",
      reason: "duplicate charge",
    },
    context: {
      customer: {
        email: "billing-upgrade@example.test",
        name: "Billing Upgrade",
      },
      order: {
        id: "order_demo_420",
        summary: "Plan upgrade duplicate billing",
      },
      risk_reason: "AI support agent detected possible duplicate billing",
    },
    requestPayload: null,
    decision: "APPROVAL_REQUIRED" as const,
    status: "APPROVAL_REQUIRED" as const,
    decisionReason:
      "RefundHold held it because your policy requires human approval for refunds between $50 and $500.",
    decidedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
    agent: {
      id: "agent_demo",
      name: "AI support agent",
    },
    connector: null,
    approvals: [],
    executions: [],
    stripeRefund: null,
    stripePaymentObject: null,
    latestStripeWebhookEvent: null,
    auditEvents: [
      {
        id: "audit_received",
        actorType: "AGENT" as const,
        type: "REQUEST_RECEIVED" as const,
        metadata: {},
        createdAt,
        agent: {
          id: "agent_demo",
          name: "AI support agent",
        },
        user: null,
      },
      {
        id: "audit_policy",
        actorType: "SYSTEM" as const,
        type: "POLICY_EVALUATED" as const,
        metadata: {},
        createdAt,
        agent: null,
        user: null,
      },
    ],
  };
}
