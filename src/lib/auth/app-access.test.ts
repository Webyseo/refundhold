import { describe, expect, it, vi } from "vitest";

import {
  getSafeAppNextPath,
  resolveAppAccessContext,
  type AppAccessPrisma,
} from "./app-access";
import type { AuthSession, CurrentUserContext } from "./current-user";

describe("app access context", () => {
  it("resolves demo access when auth is not required", async () => {
    const prisma = createPrisma();

    const result = await resolveAppAccessContext({
      env: {
        AUTHRAIL_AUTH_ENABLED: "false",
        AUTHRAIL_AUTH_REQUIRED: "false",
        AUTHRAIL_DEMO_REVIEWER_EMAIL: "demo.reviewer@refundhold.com",
      },
      nextPath: "/app/action-requests",
      prisma,
      getCurrentAuthSession: async () => {
        throw new Error("Session auth must not be read in demo mode.");
      },
      getCurrentUserContext: async () => {
        throw new Error("User context must not be read in demo mode.");
      },
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.context : null).toMatchObject({
      source: "demo",
      organizationId: "org_demo",
      domainUserId: "user_demo",
      role: "REVIEWER",
      permissions: {
        viewDashboard: true,
      },
    });
    expect(prisma.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "ACTIVE",
          user: {
            email: "demo.reviewer@refundhold.com",
            status: "ACTIVE",
          },
        },
      }),
    );
  });

  it("redirects to login with a safe internal next path when auth is required and no session exists", async () => {
    const result = await resolveAppAccessContext({
      env: enabledRequiredEnv,
      nextPath: "/app/action-requests?status=pending",
      prisma: createPrisma(),
      getCurrentAuthSession: async () => null,
      getCurrentUserContext: async () => {
        throw new Error("Context must not be read without a session.");
      },
    });

    expect(result).toEqual({
      ok: false,
      reason: "auth_required",
      status: 401,
      message: "A human session is required to access RefundHold.",
      redirectTo: "/login?next=%2Fapp%2Faction-requests%3Fstatus%3Dpending",
    });
  });

  it("sanitizes external next paths", () => {
    expect(getSafeAppNextPath("https://evil.example/app")).toBe("/app");
    expect(getSafeAppNextPath("//evil.example/app")).toBe("/app");
    expect(getSafeAppNextPath("/api/auth/session")).toBe("/app");
    expect(getSafeAppNextPath("/app/action-requests?status=pending")).toBe(
      "/app/action-requests?status=pending",
    );
  });

  it.each(["VIEWER", "REVIEWER", "ADMIN", "OWNER"] as const)(
    "allows %s sessions to view app pages when auth is required",
    async (role) => {
      const result = await resolveAppAccessContext({
        env: enabledRequiredEnv,
        nextPath: "/app",
        prisma: createPrisma(),
        getCurrentAuthSession: async () => createSession(),
        getCurrentUserContext: async () => createSessionContext({ role }),
      });

      expect(result.ok).toBe(true);
      expect(result.ok ? result.context : null).toMatchObject({
        source: "session",
        organizationId: "org_session",
        domainUserId: "user_session",
        role,
        permissions: {
          viewDashboard: true,
        },
      });
    },
  );

  it("blocks a signed-in user without an active membership", async () => {
    const result = await resolveAppAccessContext({
      env: enabledRequiredEnv,
      nextPath: "/app",
      prisma: createPrisma(),
      getCurrentAuthSession: async () => createSession(),
      getCurrentUserContext: async () => null,
    });

    expect(result).toEqual({
      ok: false,
      reason: "forbidden",
      status: 403,
      message: "No active organization membership is available.",
    });
  });

  it("fails closed if auth is required but auth is disabled", async () => {
    const result = await resolveAppAccessContext({
      env: {
        AUTHRAIL_AUTH_ENABLED: "false",
        AUTHRAIL_AUTH_REQUIRED: "true",
      },
      nextPath: "/app",
      prisma: createPrisma(),
      getCurrentAuthSession: async () => null,
      getCurrentUserContext: async () => null,
    });

    expect(result).toEqual({
      ok: false,
      reason: "failed_closed",
      status: 500,
      message: "Authentication configuration is invalid.",
    });
  });
});

const enabledRequiredEnv = {
  AUTHRAIL_AUTH_ENABLED: "true",
  AUTHRAIL_AUTH_REQUIRED: "true",
  BETTER_AUTH_SECRET: "local-test-secret",
};

function createSession(): AuthSession {
  return {
    session: {
      id: "session_123",
      userId: "auth_user_123",
    },
    user: {
      id: "auth_user_123",
      email: "reviewer@example.com",
      name: "Reviewer",
    },
  };
}

function createSessionContext({
  role = "REVIEWER",
}: {
  role?: CurrentUserContext["role"];
} = {}): CurrentUserContext {
  return {
    authUserId: "auth_user_123",
    email: "reviewer@example.com",
    organizationId: "org_session",
    organizationName: "Session Org",
    domainUserId: "user_session",
    role,
    permissions: {
      viewDashboard: true,
      reviewActionRequests: role !== "VIEWER",
      executeRefunds: role !== "VIEWER",
      managePolicies: role === "OWNER" || role === "ADMIN",
      manageConnectors: role === "OWNER" || role === "ADMIN",
      manageMembers: role === "OWNER",
    },
  };
}

function createPrisma({
  membership = createMembership(),
}: {
  membership?: Awaited<
    ReturnType<AppAccessPrisma["membership"]["findFirst"]>
  >;
} = {}): AppAccessPrisma {
  return {
    membership: {
      findFirst: vi.fn(async () => membership),
    },
  };
}

function createMembership() {
  return {
    id: "membership_demo",
    organizationId: "org_demo",
    userId: "user_demo",
    authUserId: null,
    role: "REVIEWER",
    status: "ACTIVE",
    organization: {
      id: "org_demo",
      name: "RefundHold Demo",
    },
    user: {
      id: "user_demo",
      email: "demo.reviewer@refundhold.com",
      status: "ACTIVE",
    },
  } as const;
}
