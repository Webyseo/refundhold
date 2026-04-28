import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

import { getAuthConfig, type AuthEnv } from "./config";
import { getPrismaClient } from "../db/prisma";

type PrismaAdapterClient = Parameters<typeof prismaAdapter>[0];
type BetterAuthInstance = ReturnType<typeof createBetterAuthInstance>;
type BetterAuthInstanceOptions = {
  publicSignupEnabled?: boolean;
  autoSignIn?: boolean;
};

export const authIdentityModelNames = {
  user: "authUser",
  session: "authSession",
  account: "authAccount",
  verification: "authVerification",
} as const;
export const emailPasswordAuthEnabled = true;
export const publicSignupEnabled = false;
export const oauthProvidersConfigured = false;

let cachedAuth: BetterAuthInstance | null = null;

export async function getBetterAuthOrNull(
  env: AuthEnv = process.env,
): Promise<BetterAuthInstance | null> {
  const config = getAuthConfig(env);

  if (!config.authEnabled) {
    return null;
  }

  if (cachedAuth) {
    return cachedAuth;
  }

  const prisma = await getPrismaClient();

  cachedAuth = createBetterAuthInstance(prisma as PrismaAdapterClient, {
    secret: config.betterAuthSecret,
    baseURL: config.betterAuthUrl,
    publicSignupEnabled,
  });

  return cachedAuth;
}

export async function getProvisioningBetterAuthOrThrow(
  env: AuthEnv = process.env,
): Promise<BetterAuthInstance> {
  const config = getAuthConfig({
    ...env,
    AUTHRAIL_AUTH_ENABLED: "true",
  });
  const prisma = await getPrismaClient();

  return createBetterAuthInstance(prisma as PrismaAdapterClient, {
    secret: config.betterAuthSecret,
    baseURL: config.betterAuthUrl,
    publicSignupEnabled: true,
    autoSignIn: false,
  });
}

function createBetterAuthInstance(
  prisma: PrismaAdapterClient,
  config: {
    secret: string | null;
    baseURL: string | null;
  } & BetterAuthInstanceOptions,
) {
  return betterAuth({
    appName: "RefundHold",
    secret: config.secret ?? undefined,
    baseURL: config.baseURL ?? undefined,
    database: prismaAdapter(prisma as PrismaAdapterClient, {
      provider: "postgresql",
      usePlural: false,
      transaction: true,
    }),
    user: {
      modelName: authIdentityModelNames.user,
    },
    session: {
      modelName: authIdentityModelNames.session,
    },
    account: {
      modelName: authIdentityModelNames.account,
    },
    verification: {
      modelName: authIdentityModelNames.verification,
    },
    emailAndPassword: {
      enabled: emailPasswordAuthEnabled,
      disableSignUp: !(config.publicSignupEnabled ?? publicSignupEnabled),
      autoSignIn: config.autoSignIn,
    },
  });
}
