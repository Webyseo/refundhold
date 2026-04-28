import { describe, expect, it, vi } from "vitest";

import {
  getCurrentUserContext,
  requireCurrentUserContext,
  requireMembershipRole,
  type CurrentUserContextPrisma,
} from "./current-user";

describe("current auth user context", () => {
  it("returns null when auth is disabled", async () => {
    const prisma = createPrisma();

    await expect(
      getCurrentUserContext({
        env: {},
        getSession: async () => createSession(),
        prisma,
      }),
    ).resolves.toBeNull();
    expect(prisma.membership.findFirst).not.toHaveBeenCalled();
  });

  it("returns null when there is no AuthUser session", async () => {
    const prisma = createPrisma();

    await expect(
      getCurrentUserContext({
        env: enabledEnv,
        getSession: async () => null,
        prisma,
      }),
    ).resolves.toBeNull();
    expect(prisma.membership.findFirst).not.toHaveBeenCalled();
  });

  it("returns null when the AuthUser has no active membership", async () => {
    const prisma = createPrisma({
      membership: null,
    });

    await expect(
      getCurrentUserContext({
        env: enabledEnv,
        getSession: async () => createSession(),
        prisma,
      }),
    ).resolves.toBeNull();
    expect(prisma.membership.findFirst).toHaveBeenCalledWith({
      where: {
        authUserId: "auth_user_123",
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        organization: true,
        user: true,
      },
    });
  });

  it("ignores disabled memberships by filtering for ACTIVE only", async () => {
    const prisma = createPrisma({
      membership: null,
    });

    await getCurrentUserContext({
      env: enabledEnv,
      getSession: async () => createSession(),
      prisma,
    });

    expect(prisma.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
        }),
      }),
    );
  });

  it("returns active membership organization, domain user, role, and permissions", async () => {
    const context = await getCurrentUserContext({
      env: enabledEnv,
      getSession: async () => createSession(),
      prisma: createPrisma(),
    });

    expect(context).toMatchObject({
      authUserId: "auth_user_123",
      email: "reviewer@example.com",
      organizationId: "org_123",
      organizationName: "RefundHold Demo",
      domainUserId: "domain_user_123",
      role: "REVIEWER",
      permissions: {
        viewDashboard: true,
        reviewActionRequests: true,
        executeRefunds: true,
        managePolicies: false,
        manageConnectors: false,
        manageMembers: false,
      },
    });
  });

  it("uses the first active membership deterministically until org selection exists", async () => {
    const prisma = createPrisma();

    await getCurrentUserContext({
      env: enabledEnv,
      getSession: async () => createSession(),
      prisma,
    });

    expect(prisma.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          createdAt: "asc",
        },
      }),
    );
  });

  it("does not read AgentApiKey identities for human session context", async () => {
    const prisma = new Proxy(createPrisma(), {
      get(target, prop) {
        if (prop === "agentApiKey") {
          throw new Error("AgentApiKey must not be read for user sessions.");
        }

        return Reflect.get(target, prop);
      },
    }) as CurrentUserContextPrisma;

    await expect(
      getCurrentUserContext({
        env: enabledEnv,
        getSession: async () => createSession(),
        prisma,
      }),
    ).resolves.toMatchObject({
      authUserId: "auth_user_123",
    });
  });

  it("requireCurrentUserContext fails closed without a context", async () => {
    await expect(
      requireCurrentUserContext({
        env: enabledEnv,
        getSession: async () => null,
        prisma: createPrisma(),
      }),
    ).rejects.toThrow("AUTH_SESSION_REQUIRED");
  });

  it("requireMembershipRole enforces role permissions", async () => {
    const viewerContext = await getCurrentUserContext({
      env: enabledEnv,
      getSession: async () => createSession(),
      prisma: createPrisma({
        membership: createMembership({
          role: "VIEWER",
        }),
      }),
    });

    expect(viewerContext).not.toBeNull();
    expect(viewerContext?.role).toBe("VIEWER");
    expect(() =>
      requireMembershipRole(viewerContext, "reviewActionRequests"),
    ).toThrow("AUTH_FORBIDDEN");
  });
});

const enabledEnv = {
  AUTHRAIL_AUTH_ENABLED: "true",
  BETTER_AUTH_SECRET: "local-test-secret",
};

function createSession() {
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

function createMembership({
  role = "REVIEWER",
}: {
  role?: "OWNER" | "ADMIN" | "REVIEWER" | "VIEWER";
} = {}) {
  return {
    id: "membership_123",
    authUserId: "auth_user_123",
    userId: "domain_user_123",
    organizationId: "org_123",
    role,
    status: "ACTIVE",
    organization: {
      id: "org_123",
      name: "RefundHold Demo",
    },
    user: {
      id: "domain_user_123",
      email: "reviewer@example.com",
      status: "ACTIVE",
    },
  } as const;
}

function createPrisma({
  membership = createMembership(),
}: {
  membership?: ReturnType<typeof createMembership> | null;
} = {}): CurrentUserContextPrisma {
  return {
    membership: {
      findFirst: vi.fn(async () => membership),
    },
  };
}
