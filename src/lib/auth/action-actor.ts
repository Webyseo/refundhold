import { getAuthConfig, type AuthEnv } from "./config";
import {
  getCurrentUserContext,
  type CurrentUserContext,
  type CurrentUserPermissions,
} from "./current-user";
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

type JsonObject = {
  [key: string]: string | number | boolean | null | JsonObject;
};

type ActionActorMembershipRecord = {
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

export type ActionActorPrisma = {
  membership: {
    findFirst: (args: unknown) => Promise<ActionActorMembershipRecord | null>;
  };
};

export type HumanActionPermission =
  | "reviewActionRequests"
  | "executeRefunds";

export type HumanActionActor = {
  source: "session" | "demo";
  organizationId: string;
  domainUserId: string;
  email: string;
  role: MembershipRole;
  permissions: CurrentUserPermissions;
};

export type ResolveHumanActionActorResponse =
  | {
      ok: true;
      actor: HumanActionActor;
    }
  | {
      ok: false;
      response: {
        status: number;
        body: JsonObject;
      };
    };

export type ResolveHumanActionActorInput = {
  request?: Request;
  requiredPermission: HumanActionPermission;
  env?: AuthEnv;
  demoReviewerEmail?: string | null;
  prisma?: ActionActorPrisma;
  getCurrentUserContext?: () => Promise<CurrentUserContext | null>;
};

export async function resolveHumanActionActor({
  request,
  requiredPermission,
  env = process.env,
  demoReviewerEmail,
  prisma,
  getCurrentUserContext: getSessionContext,
}: ResolveHumanActionActorInput): Promise<ResolveHumanActionActorResponse> {
  let authConfig: ReturnType<typeof getAuthConfig>;

  try {
    authConfig = getAuthConfig(env);
  } catch {
    return failedClosedResponse("Authentication configuration is invalid.");
  }

  if (authConfig.authEnabled) {
    const sessionContext = await (getSessionContext
      ? getSessionContext()
      : getCurrentUserContext({ env }));

    if (sessionContext) {
      return actorForPermission(toSessionActor(sessionContext), requiredPermission);
    }

    if (authConfig.authRequired) {
      return unauthorizedResponse("A human session is required for this action.");
    }
  }

  if (hasBearerAuthorization(request)) {
    return unauthorizedResponse(
      "Agent API keys cannot authorize human review actions.",
    );
  }

  if (authConfig.authRequired) {
    return unauthorizedResponse("A human session is required for this action.");
  }

  return resolveDemoActor({
    email:
      demoReviewerEmail ??
      request?.headers.get("x-refundhold-reviewer-email") ??
      null,
    requiredPermission,
    prisma,
  });
}

export function createHumanActorAuditMetadata(
  actor: HumanActionActor | undefined,
): JsonObject {
  if (!actor) {
    return {};
  }

  return {
    actor_source: actor.source,
    actor_email: actor.email,
    actor_role: actor.role,
    domain_user_id: actor.domainUserId,
  };
}

async function resolveDemoActor({
  email,
  requiredPermission,
  prisma,
}: {
  email: string | null;
  requiredPermission: HumanActionPermission;
  prisma?: ActionActorPrisma;
}): Promise<ResolveHumanActionActorResponse> {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return unauthorizedResponse("X-RefundHold-Reviewer-Email header is required.");
  }

  const persistence =
    prisma ??
    ((await getPrismaClient()) as unknown as ActionActorPrisma);
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
    return forbiddenResponse("Reviewer is not authorized for this organization.");
  }

  return actorForPermission(
    {
      source: "demo",
      organizationId: membership.organization.id,
      domainUserId: membership.user.id,
      email: membership.user.email,
      role: membership.role,
      permissions: buildPermissions(membership.role),
    },
    requiredPermission,
  );
}

function toSessionActor(context: CurrentUserContext): HumanActionActor {
  return {
    source: "session",
    organizationId: context.organizationId,
    domainUserId: context.domainUserId,
    email: context.email,
    role: context.role,
    permissions: context.permissions,
  };
}

function actorForPermission(
  actor: HumanActionActor,
  permission: HumanActionPermission,
): ResolveHumanActionActorResponse {
  if (!actor.permissions[permission]) {
    return forbiddenResponse("You do not have permission to perform this action.");
  }

  return {
    ok: true,
    actor,
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

function hasBearerAuthorization(request: Request | undefined): boolean {
  const authorization = request?.headers.get("authorization");

  return authorization?.trim().toLowerCase().startsWith("bearer ") ?? false;
}

function unauthorizedResponse(message: string): ResolveHumanActionActorResponse {
  return {
    ok: false,
    response: {
      status: 401,
      body: {
        error: "unauthorized",
        message,
      },
    },
  };
}

function forbiddenResponse(message: string): ResolveHumanActionActorResponse {
  return {
    ok: false,
    response: {
      status: 403,
      body: {
        error: "forbidden",
        message,
      },
    },
  };
}

function failedClosedResponse(message: string): ResolveHumanActionActorResponse {
  return {
    ok: false,
    response: {
      status: 500,
      body: {
        error: "failed_closed",
        message,
      },
    },
  };
}
