import { describe, expect, it, vi } from "vitest";

import {
  resolveHumanActionActor,
  type ActionActorPrisma,
  type HumanActionActor,
} from "./action-actor";
import type { CurrentUserContext } from "./current-user";

describe("resolveHumanActionActor", () => {
  it("resolves a demo reviewer when auth is disabled", async () => {
    const prisma = createPrisma();

    const result = await resolveHumanActionActor({
      request: createRequest({
        "x-refundhold-reviewer-email": "demo.reviewer@refundhold.com",
      }),
      requiredPermission: "reviewActionRequests",
      env: {
        AUTHRAIL_AUTH_ENABLED: "false",
        AUTHRAIL_AUTH_REQUIRED: "false",
      },
      prisma,
      getCurrentUserContext: async () => {
        throw new Error("Session auth must not be read when auth is disabled.");
      },
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.actor : null).toMatchObject({
      source: "demo",
      email: "demo.reviewer@refundhold.com",
      organizationId: "org_123",
      domainUserId: "user_123",
      role: "REVIEWER",
      permissions: {
        reviewActionRequests: true,
        executeRefunds: true,
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

  it("uses a valid session actor before demo fallback", async () => {
    const prisma = createPrisma();
    const sessionContext = createSessionContext({
      email: "session.reviewer@refundhold.com",
      role: "ADMIN",
    });

    const result = await resolveHumanActionActor({
      request: createRequest({
        "x-refundhold-reviewer-email": "demo.reviewer@refundhold.com",
      }),
      requiredPermission: "reviewActionRequests",
      env: enabledEnv,
      prisma,
      getCurrentUserContext: async () => sessionContext,
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.actor : null).toMatchObject({
      source: "session",
      email: "session.reviewer@refundhold.com",
      role: "ADMIN",
    });
    expect(prisma.membership.findFirst).not.toHaveBeenCalled();
  });

  it("blocks viewer sessions for review actions", async () => {
    const result = await resolveHumanActionActor({
      request: createRequest(),
      requiredPermission: "reviewActionRequests",
      env: enabledEnv,
      prisma: createPrisma(),
      getCurrentUserContext: async () =>
        createSessionContext({
          role: "VIEWER",
        }),
    });

    expect(result).toEqual({
      ok: false,
      response: {
        status: 403,
        body: {
          error: "forbidden",
          message: "You do not have permission to perform this action.",
        },
      },
    });
  });

  it("does not allow demo fallback when auth is required", async () => {
    const prisma = createPrisma();

    const result = await resolveHumanActionActor({
      request: createRequest({
        "x-refundhold-reviewer-email": "demo.reviewer@refundhold.com",
      }),
      requiredPermission: "executeRefunds",
      env: {
        ...enabledEnv,
        AUTHRAIL_AUTH_REQUIRED: "true",
      },
      prisma,
      getCurrentUserContext: async () => null,
    });

    expect(result).toEqual({
      ok: false,
      response: {
        status: 401,
        body: {
          error: "unauthorized",
          message: "A human session is required for this action.",
        },
      },
    });
    expect(prisma.membership.findFirst).not.toHaveBeenCalled();
  });

  it("does not treat Bearer agent API keys as human actors", async () => {
    const prisma = createPrisma();

    const result = await resolveHumanActionActor({
      request: createRequest({
        authorization: "Bearer ar_demo_prefix_secret",
        "x-refundhold-reviewer-email": "demo.reviewer@refundhold.com",
      }),
      requiredPermission: "reviewActionRequests",
      env: {
        AUTHRAIL_AUTH_ENABLED: "false",
        AUTHRAIL_AUTH_REQUIRED: "false",
      },
      prisma,
      getCurrentUserContext: async () => null,
    });

    expect(result).toEqual({
      ok: false,
      response: {
        status: 401,
        body: {
          error: "unauthorized",
          message: "Agent API keys cannot authorize human review actions.",
        },
      },
    });
    expect(prisma.membership.findFirst).not.toHaveBeenCalled();
  });

  it("fails closed when demo reviewer has no active membership", async () => {
    const result = await resolveHumanActionActor({
      request: createRequest({
        "x-refundhold-reviewer-email": "demo.reviewer@refundhold.com",
      }),
      requiredPermission: "executeRefunds",
      env: {
        AUTHRAIL_AUTH_ENABLED: "false",
        AUTHRAIL_AUTH_REQUIRED: "false",
      },
      prisma: createPrisma({
        membership: null,
      }),
      getCurrentUserContext: async () => null,
    });

    expect(result).toEqual({
      ok: false,
      response: {
        status: 403,
        body: {
          error: "forbidden",
          message: "Reviewer is not authorized for this organization.",
        },
      },
    });
  });
});

const enabledEnv = {
  AUTHRAIL_AUTH_ENABLED: "true",
  AUTHRAIL_AUTH_REQUIRED: "false",
  BETTER_AUTH_SECRET: "local-test-secret",
};

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/v1/action-requests/ar/approve", {
    method: "POST",
    headers,
  });
}

function createSessionContext({
  email = "reviewer@example.com",
  role = "REVIEWER",
  organizationId = "org_123",
}: {
  email?: string;
  role?: HumanActionActor["role"];
  organizationId?: string;
} = {}): CurrentUserContext {
  return {
    authUserId: "auth_user_123",
    email,
    organizationId,
    organizationName: "RefundHold Demo",
    domainUserId: "user_123",
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
    ReturnType<ActionActorPrisma["membership"]["findFirst"]>
  >;
} = {}): ActionActorPrisma {
  return {
    membership: {
      findFirst: vi.fn(async () => membership),
    },
  };
}

function createMembership() {
  return {
    id: "membership_123",
    organizationId: "org_123",
    userId: "user_123",
    authUserId: null,
    role: "REVIEWER",
    status: "ACTIVE",
    organization: {
      id: "org_123",
      name: "RefundHold Demo",
    },
    user: {
      id: "user_123",
      email: "demo.reviewer@refundhold.com",
      status: "ACTIVE",
    },
  } as const;
}
