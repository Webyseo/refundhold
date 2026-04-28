import "dotenv/config";

import { pathToFileURL } from "node:url";

import { getProvisioningBetterAuthOrThrow } from "../src/lib/auth/auth";
import { getPrismaClient } from "../src/lib/db/prisma";

type ProvisionRole = "OWNER" | "ADMIN" | "REVIEWER" | "VIEWER";

type ProvisionAuthUserEnv = {
  [key: string]: string | undefined;
  AUTHRAIL_AUTH_PROVISIONING_ENABLED?: string;
  AUTHRAIL_PROVISION_EMAIL?: string;
  AUTHRAIL_PROVISION_PASSWORD?: string;
  AUTHRAIL_PROVISION_NAME?: string;
  AUTHRAIL_PROVISION_ORGANIZATION_ID?: string;
  AUTHRAIL_PROVISION_ROLE?: string;
  BASE_URL?: string;
};

export type ProvisionAuthUserInput = {
  email: string;
  password: string;
  name: string;
  organizationId: string;
  role: ProvisionRole;
};

export type ProvisionAuthUserResult = {
  email: string;
  organizationId: string;
  role: ProvisionRole;
  authUserId: string;
  domainUserId: string;
  createdAuthUser: boolean;
  createdDomainUser: boolean;
};

type OrganizationRecord = {
  id: string;
  name: string;
};

type AuthUserRecord = {
  id: string;
  email: string;
  name: string;
};

type DomainUserRecord = {
  id: string;
  authUserId: string | null;
};

export type ProvisionAuthUserDependencies = {
  findOrganizationById: (
    organizationId: string,
  ) => Promise<OrganizationRecord | null>;
  findAuthUserByEmail: (email: string) => Promise<AuthUserRecord | null>;
  createAuthUserWithCredential: (input: {
    email: string;
    password: string;
    name: string;
  }) => Promise<AuthUserRecord>;
  hasCredentialAccount: (authUserId: string) => Promise<boolean>;
  findDomainUserByOrganizationEmail: (
    organizationId: string,
    email: string,
  ) => Promise<DomainUserRecord | null>;
  createDomainUser: (input: {
    organizationId: string;
    authUserId: string;
    email: string;
    displayName: string;
  }) => Promise<DomainUserRecord>;
  updateDomainUserAuthLink: (
    userId: string,
    authUserId: string,
  ) => Promise<void>;
  upsertMembership: (input: {
    organizationId: string;
    authUserId: string;
    userId: string;
    role: ProvisionRole;
  }) => Promise<{ id: string }>;
};

export class ProvisionAuthUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProvisionAuthUserError";
  }
}

export function readAuthProvisioningConfig(
  env: ProvisionAuthUserEnv = process.env,
): ProvisionAuthUserInput {
  if (!isEnabledValue(env.AUTHRAIL_AUTH_PROVISIONING_ENABLED)) {
    throw new ProvisionAuthUserError(
      "AUTHRAIL_AUTH_PROVISIONING_ENABLED must be true.",
    );
  }

  if (isProductionRefundHoldUrl(env.BASE_URL)) {
    throw new ProvisionAuthUserError(
      "Auth provisioning is blocked for production RefundHold URLs.",
    );
  }

  const email = readRequiredEnv(env, "AUTHRAIL_PROVISION_EMAIL").toLowerCase();
  const password = readRequiredEnv(env, "AUTHRAIL_PROVISION_PASSWORD");
  const name = readRequiredEnv(env, "AUTHRAIL_PROVISION_NAME");
  const organizationId = readRequiredEnv(
    env,
    "AUTHRAIL_PROVISION_ORGANIZATION_ID",
  );
  const role = readProvisionRole(readRequiredEnv(env, "AUTHRAIL_PROVISION_ROLE"));

  if (password.length < 12) {
    throw new ProvisionAuthUserError(
      "AUTHRAIL_PROVISION_PASSWORD must be at least 12 characters.",
    );
  }

  return {
    email,
    password,
    name,
    organizationId,
    role,
  };
}

export async function provisionAuthUser(
  input: ProvisionAuthUserInput,
  deps: ProvisionAuthUserDependencies,
): Promise<ProvisionAuthUserResult> {
  const email = input.email.trim().toLowerCase();
  const organization = await deps.findOrganizationById(input.organizationId);

  if (!organization) {
    throw new ProvisionAuthUserError("AUTH_PROVISION_ORGANIZATION_NOT_FOUND");
  }

  const existingAuthUser = await deps.findAuthUserByEmail(email);
  let authUser = existingAuthUser;
  let createdAuthUser = false;

  if (!authUser) {
    authUser = await deps.createAuthUserWithCredential({
      email,
      password: input.password,
      name: input.name,
    });
    createdAuthUser = true;
  } else if (!(await deps.hasCredentialAccount(authUser.id))) {
    throw new ProvisionAuthUserError("AUTH_USER_EXISTS_WITHOUT_CREDENTIAL");
  }

  const existingDomainUser = await deps.findDomainUserByOrganizationEmail(
    organization.id,
    email,
  );
  let domainUser = existingDomainUser;
  let createdDomainUser = false;

  if (!domainUser) {
    domainUser = await deps.createDomainUser({
      organizationId: organization.id,
      authUserId: authUser.id,
      email,
      displayName: input.name,
    });
    createdDomainUser = true;
  } else if (domainUser.authUserId !== authUser.id) {
    await deps.updateDomainUserAuthLink(domainUser.id, authUser.id);
  }

  await deps.upsertMembership({
    organizationId: organization.id,
    authUserId: authUser.id,
    userId: domainUser.id,
    role: input.role,
  });

  return {
    email,
    organizationId: organization.id,
    role: input.role,
    authUserId: authUser.id,
    domainUserId: domainUser.id,
    createdAuthUser,
    createdDomainUser,
  };
}

export function createSafeProvisioningSummary(
  result: ProvisionAuthUserResult,
): string {
  return [
    "Provisioned RefundHold auth user.",
    `email=${result.email}`,
    `organizationId=${result.organizationId}`,
    `role=${result.role}`,
    `createdAuthUser=${result.createdAuthUser}`,
    `createdDomainUser=${result.createdDomainUser}`,
  ].join(" ");
}

async function createPrismaProvisioningDependencies(): Promise<ProvisionAuthUserDependencies> {
  const prisma = (await getPrismaClient()) as unknown as {
    organization: {
      findUnique: (args: unknown) => Promise<OrganizationRecord | null>;
    };
    authUser: {
      findUnique: (args: unknown) => Promise<AuthUserRecord | null>;
    };
    authAccount: {
      findFirst: (args: unknown) => Promise<{ id: string } | null>;
    };
    user: {
      findFirst: (args: unknown) => Promise<DomainUserRecord | null>;
      create: (args: unknown) => Promise<DomainUserRecord>;
      update: (args: unknown) => Promise<DomainUserRecord>;
    };
    membership: {
      upsert: (args: unknown) => Promise<{ id: string }>;
    };
  };
  const auth = await getProvisioningBetterAuthOrThrow(process.env);

  return {
    findOrganizationById: async (organizationId) =>
      prisma.organization.findUnique({
        where: {
          id: organizationId,
        },
        select: {
          id: true,
          name: true,
        },
      }),
    findAuthUserByEmail: async (email) =>
      prisma.authUser.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      }),
    hasCredentialAccount: async (authUserId) => {
      const credential = await prisma.authAccount.findFirst({
        where: {
          userId: authUserId,
          providerId: "credential",
        },
        select: {
          id: true,
        },
      });

      return Boolean(credential);
    },
    createAuthUserWithCredential: async ({ email, password, name }) => {
      const result = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
          rememberMe: false,
        },
      });

      return {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      };
    },
    findDomainUserByOrganizationEmail: async (organizationId, email) =>
      prisma.user.findFirst({
        where: {
          organizationId,
          email,
        },
        select: {
          id: true,
          authUserId: true,
        },
      }),
    createDomainUser: async ({ organizationId, authUserId, email, displayName }) =>
      prisma.user.create({
        data: {
          organizationId,
          authUserId,
          email,
          displayName,
        },
        select: {
          id: true,
          authUserId: true,
        },
      }),
    updateDomainUserAuthLink: async (userId, authUserId) => {
      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          authUserId,
        },
        select: {
          id: true,
        },
      });
    },
    upsertMembership: async ({ organizationId, authUserId, userId, role }) =>
      prisma.membership.upsert({
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          },
        },
        create: {
          organizationId,
          authUserId,
          userId,
          role,
          status: "ACTIVE",
        },
        update: {
          authUserId,
          role,
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      }),
  };
}

function readRequiredEnv(
  env: ProvisionAuthUserEnv,
  name: keyof ProvisionAuthUserEnv,
): string {
  const value = env[name]?.trim();

  if (!value) {
    throw new ProvisionAuthUserError(`${name} is required.`);
  }

  return value;
}

function readProvisionRole(value: string): ProvisionRole {
  if (
    value === "OWNER" ||
    value === "ADMIN" ||
    value === "REVIEWER" ||
    value === "VIEWER"
  ) {
    return value;
  }

  throw new ProvisionAuthUserError(
    "AUTHRAIL_PROVISION_ROLE must be OWNER, ADMIN, REVIEWER, or VIEWER.",
  );
}

function isEnabledValue(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(
    value?.trim().toLowerCase() ?? "",
  );
}

function isProductionRefundHoldUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const hostname = new URL(value).hostname.toLowerCase();

    return hostname === "refundhold.com" || hostname === "www.refundhold.com";
  } catch {
    return false;
  }
}

function isMainModule() {
  const entrypoint = process.argv[1];

  return entrypoint
    ? import.meta.url === pathToFileURL(entrypoint).href
    : false;
}

if (isMainModule()) {
  const input = readAuthProvisioningConfig(process.env);
  const deps = await createPrismaProvisioningDependencies();
  const result = await provisionAuthUser(input, deps);

  console.log(createSafeProvisioningSummary(result));
}
