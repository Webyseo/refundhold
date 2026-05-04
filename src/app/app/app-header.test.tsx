import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AppHeaderContent } from "./app-header";
import type { AppAccessContext } from "@/lib/auth/app-access";

vi.mock("./actions", () => ({
  clearDemoAccessFromDashboard: async () => undefined,
}));

describe("AppHeaderContent", () => {
  it("shows demo identity and exit demo action in demo mode", () => {
    const html = renderToStaticMarkup(
      <AppHeaderContent context={createAccessContext({ source: "demo" })} />,
    );

    expect(html).toContain("Demo simulation");
    expect(html).toContain("Private demo");
    expect(html).toContain("Demo Reviewer");
    expect(html).toContain("Reviewer");
    expect(html).toContain("No live Stripe money moves in this demo.");
    expect(html).toContain("aria-current=\"page\"");
    expect(html).toContain("href=\"/app/refund-requests\"");
    expect(html).toContain("href=\"/app/onboarding\"");
    expect(html).toContain("Onboarding");
    expect(html).toContain("href=\"/app/stripe\"");
    expect(html).toContain("Stripe");
    expect(html).toContain("href=\"/app/feedback\"");
    expect(html).toContain("Feedback");
    expect(html).toContain("Exit demo");
    expect(html).not.toContain("Authenticated session");
    expect(html).not.toContain("Controlled demo access");
    expect(html).not.toContain("reviewer@example.com");
  });

  it("shows authenticated identity and sign out action in session mode", () => {
    const html = renderToStaticMarkup(
      <AppHeaderContent context={createAccessContext({ source: "session" })} />,
    );

    expect(html).toContain("Demo simulation");
    expect(html).toContain("Local Reviewer");
    expect(html).toContain("reviewer@example.com");
    expect(html).toContain("Session Org");
    expect(html).toContain("Reviewer");
    expect(html).toContain("Sign out");
    expect(html).not.toContain("Exit demo");
    expect(html).not.toContain("Private demo");
    expect(html).not.toContain("Controlled demo access");
  });
});

function createAccessContext({
  source,
}: {
  source: AppAccessContext["source"];
}): AppAccessContext {
  return {
    source,
    mode: source,
    authEnabled: source === "session",
    authRequired: source === "session",
    authUserId: source === "session" ? "auth_user_123" : null,
    displayName: source === "session" ? "Local Reviewer" : "Demo Reviewer",
    email:
      source === "session"
        ? "reviewer@example.com"
        : "demo.reviewer@refundhold.com",
    organizationId: source === "session" ? "org_session" : "org_demo",
    organizationName: source === "session" ? "Session Org" : "RefundHold Demo",
    domainUserId: source === "session" ? "user_session" : "user_demo",
    role: "REVIEWER",
    permissions: {
      viewDashboard: true,
      reviewActionRequests: true,
      executeRefunds: true,
      managePolicies: false,
      manageConnectors: false,
      manageMembers: false,
    },
  };
}
