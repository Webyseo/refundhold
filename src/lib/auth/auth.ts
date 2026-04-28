import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

import { getAuthConfig, type AuthEnv } from "./config";
import { getPrismaClient } from "../db/prisma";

type PrismaAdapterClient = Parameters<typeof prismaAdapter>[0];
type BetterAuthInstance = ReturnType<typeof createBetterAuthInstance>;

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
  });

  return cachedAuth;
}

function createBetterAuthInstance(
  prisma: PrismaAdapterClient,
  config: {
    secret: string | null;
    baseURL: string | null;
  },
) {
  return betterAuth({
    appName: "RefundHold",
    secret: config.secret ?? undefined,
    baseURL: config.baseURL ?? undefined,
    database: prismaAdapter(prisma as PrismaAdapterClient, {
      provider: "postgresql",
      usePlural: true,
      transaction: true,
    }),
    user: {
      modelName: "users",
      fields: {
        name: "displayName",
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
  });
}
