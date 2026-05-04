import {
  getCurrentAuthSession,
  getCurrentUserContext,
  type AuthSession,
  type CurrentUserContext,
  type CurrentUserPermissions,
} from "./current-user";
import { getAuthConfig, type AuthEnv } from "./config";
import {
  canExecuteRefunds,
  canManageConnectors,
  canManageMembers,
  canManagePolicies,
  canReviewActionRequests,
  canViewDashboard,
  type MembershipRole,
} from "./rbac";
import { getPrismaClient } from "../db/prisma";
import { readOptionalEnvWithLegacy } from "../env";

const defaultDemoReviewerEmail = "demo.reviewer@refundhold.com";

type AppAccessMembershipRecord = {
  id: string;
  organizationId: string;
  userId: string;
  authUserId: string | null;
  role: MembershipRole;
  status: "ACTIVE" | "INVITED" | "DISABLED";
  organization: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    email: string;
    status: string;
  };
};

export type AppAccessPrisma = {
  membership: {
    findFirst: (args: unknown) => Promise<AppAccessMembershipRecord | null>;
  };
};

export type AppAccessContext = {
  source: "session" | "demo";
  mode: "session" | "demo";
  authEnabled: boolean;
  authRequired: boolean;
  authUserId: string | null;
  displayName: string;
  email: string;
  organizationId: string;
  organizationName: string;
  domainUserId: string;
  role: MembershipRole;
  permissions: CurrentUserPermissions;
};

export type ResolveAppAccessContextResult =
  | {
      ok: true;
      context: AppAccessContext;
    }
  | {
      ok: false;
      reason: "auth_required";
      status: 401;
      message: string;
      redirectTo: string;
    }
  | {
      ok: false;
      reason: "forbidden" | "failed_closed";
      status: 403 | 500;
      message: string;
    };

export type ResolveAppAccessContextInput = {
  env?: AuthEnv;
  nextPath?: string | null;
  demoReviewerEmail?: string | null;
  prisma?: AppAccessPrisma;
  getCurrentAuthSession?: () => Promise<AuthSession>;
  getCurrentUserContext?: () => Promise<CurrentUserContext | null>;
};

export async function getAppAccessContext(
  input: ResolveAppAccessContextInput = {},
): Promise<ResolveAppAccessContextResult> {
  return resolveAppAccessContext(input);
}

export async function resolveAppAccessContext({
  env = process.env,
  nextPath = "/app",
  demoReviewerEmail,
  prisma,
  getCurrentAuthSession: getSession,
  getCurrentUserContext: getSessionContext,
}: ResolveAppAccessContextInput = {}): Promise<ResolveAppAccessContextResult> {
  let authConfig: ReturnType<typeof getAuthConfig>;

  try {
    authConfig = getAuthConfig(env);
  } catch {
    return {
      ok: false,
      reason: "failed_closed",
      status: 500,
      message: "Authentication configuration is invalid.",
    };
  }

  if (authConfig.authRequired) {
    const session = await (getSession ? getSession() : getCurrentAuthSession(env));

    if (!session) {
      return {
        ok: false,
        reason: "auth_required",
        status: 401,
        message: "A human session is required to access RefundHold.",
        redirectTo: buildLoginRedirect(nextPath),
      };
    }

    const context = await (getSessionContext
      ? getSessionContext()
      : getCurrentUserContext({
          env,
          getSession: async () => session,
        }));

    if (!context) {
      return {
        ok: false,
        reason: "forbidden",
        status: 403,
        message: "No active organization membership is available.",
      };
    }

    if (!context.permissions.viewDashboard) {
      return {
        ok: false,
        reason: "forbidden",
        status: 403,
        message: "You do not have permission to view this dashboard.",
      };
    }

    return {
      ok: true,
      context: {
        source: "session",
        mode: "session",
        authEnabled: authConfig.authEnabled,
        authRequired: authConfig.authRequired,
        authUserId: context.authUserId,
        displayName: context.displayName?.trim() || context.email,
        email: context.email,
        organizationId: context.organizationId,
        organizationName: context.organizationName,
        domainUserId: context.domainUserId,
        role: context.role,
        permissions: context.permissions,
      },
    };
  }

  return resolveDemoAppAccess({
    email:
      demoReviewerEmail ??
      readOptionalEnvWithLegacy(
        env,
        "REFUNDHOLD_DEMO_REVIEWER_EMAIL",
        "AUTHRAIL_DEMO_REVIEWER_EMAIL",
      ) ??
      defaultDemoReviewerEmail,
    authEnabled: authConfig.authEnabled,
    authRequired: authConfig.authRequired,
    prisma,
  });
}

export function getSafeAppNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  let url: URL;

  try {
    url = new URL(value, "https://refundhold.invalid");
  } catch {
    return "/app";
  }

  if (url.origin !== "https://refundhold.invalid") {
    return "/app";
  }

  if (url.pathname === "/app" || url.pathname.startsWith("/app/")) {
    return `${url.pathname}${url.search}`;
  }

  return "/app";
}

function buildLoginRedirect(nextPath: string | null | undefined): string {
  const searchParams = new URLSearchParams();
  searchParams.set("next", getSafeAppNextPath(nextPath));

  return `/login?${searchParams}`;
}

async function resolveDemoAppAccess({
  email,
  authEnabled,
  authRequired,
  prisma,
}: {
  email: string | null;
  authEnabled: boolean;
  authRequired: boolean;
  prisma?: AppAccessPrisma;
}): Promise<ResolveAppAccessContextResult> {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return {
      ok: false,
      reason: "forbidden",
      status: 403,
      message: "Demo reviewer is not configured.",
    };
  }

  const persistence =
    prisma ??
    ((await getPrismaClient()) as unknown as AppAccessPrisma);
  const membership = await persistence.membership.findFirst({
    where: {
      status: "ACTIVE",
      user: {
        email: normalizedEmail,
        status: "ACTIVE",
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      organization: true,
      user: true,
    },
  });

  if (!membership || membership.user.status !== "ACTIVE") {
    return {
      ok: false,
      reason: "forbidden",
      status: 403,
      message: "Demo reviewer is not authorized for this organization.",
    };
  }

  const permissions = buildPermissions(membership.role);

  if (!permissions.viewDashboard) {
    return {
      ok: false,
      reason: "forbidden",
      status: 403,
      message: "You do not have permission to view this dashboard.",
    };
  }

  return {
    ok: true,
    context: {
      source: "demo",
      mode: "demo",
      authEnabled,
      authRequired,
      authUserId: membership.authUserId,
      displayName: "Demo Reviewer",
      email: membership.user.email,
      organizationId: membership.organization.id,
      organizationName: membership.organization.name,
      domainUserId: membership.user.id,
      role: membership.role,
      permissions,
    },
  };
}

function buildPermissions(role: MembershipRole): CurrentUserPermissions {
  return {
    viewDashboard: canViewDashboard(role),
    reviewActionRequests: canReviewActionRequests(role),
    executeRefunds: canExecuteRefunds(role),
    managePolicies: canManagePolicies(role),
    manageConnectors: canManageConnectors(role),
    manageMembers: canManageMembers(role),
  };
}
