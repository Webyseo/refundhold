import { headers } from "next/headers";

import {
  canExecuteRefunds,
  canManageConnectors,
  canManageMembers,
  canManagePolicies,
  canReviewActionRequests,
  canViewDashboard,
  type MembershipRole,
} from "./rbac";
import { getBetterAuthOrNull } from "./auth";
import { getAuthConfig, type AuthEnv } from "./config";
import { getPrismaClient } from "../db/prisma";

export type AuthSession = {
  session: {
    id: string;
    userId: string;
  };
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
} | null;

type CurrentUserMembershipRecord = {
  id: string;
  authUserId: string | null;
  userId: string;
  organizationId: string;
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

export type CurrentUserContextPrisma = {
  membership: {
    findFirst: (args: unknown) => Promise<CurrentUserMembershipRecord | null>;
  };
};

export type CurrentUserPermissions = {
  viewDashboard: boolean;
  reviewActionRequests: boolean;
  executeRefunds: boolean;
  managePolicies: boolean;
  manageConnectors: boolean;
  manageMembers: boolean;
};

export type CurrentUserContext = {
  authUserId: string;
  email: string;
  organizationId: string;
  organizationName: string;
  domainUserId: string;
  role: MembershipRole;
  permissions: CurrentUserPermissions;
};

type GetCurrentUserContextOptions = {
  env?: AuthEnv;
  getSession?: () => Promise<AuthSession>;
  prisma?: CurrentUserContextPrisma;
};

type PermissionName = keyof CurrentUserPermissions;

export async function getCurrentAuthSession(
  env: AuthEnv = process.env,
): Promise<AuthSession> {
  const config = getAuthConfig(env);

  if (!config.authEnabled) {
    return null;
  }

  const auth = await getBetterAuthOrNull(env);

  if (!auth) {
    return null;
  }

  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function getCurrentUserContext(
  options: GetCurrentUserContextOptions = {},
): Promise<CurrentUserContext | null> {
  const env = options.env ?? process.env;
  const config = getAuthConfig(env);

  if (!config.authEnabled) {
    return null;
  }

  const session = options.getSession
    ? await options.getSession()
    : await getCurrentAuthSession(env);

  if (!session?.user?.id) {
    return null;
  }

  const prisma =
    options.prisma ??
    ((await getPrismaClient()) as unknown as CurrentUserContextPrisma);
  const membership = await prisma.membership.findFirst({
    where: {
      authUserId: session.user.id,
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

  if (!membership) {
    return null;
  }

  return {
    authUserId: session.user.id,
    email: session.user.email,
    organizationId: membership.organization.id,
    organizationName: membership.organization.name,
    domainUserId: membership.user.id,
    role: membership.role,
    permissions: buildPermissions(membership.role),
  };
}

export async function requireCurrentUserContext(
  options: GetCurrentUserContextOptions = {},
): Promise<CurrentUserContext> {
  const context = await getCurrentUserContext(options);

  if (!context) {
    throw new Error("AUTH_SESSION_REQUIRED");
  }

  return context;
}

export function requireMembershipRole(
  context: CurrentUserContext | null,
  permission: PermissionName,
): CurrentUserContext {
  if (!context) {
    throw new Error("AUTH_SESSION_REQUIRED");
  }

  if (!context.permissions[permission]) {
    throw new Error("AUTH_FORBIDDEN");
  }

  return context;
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
