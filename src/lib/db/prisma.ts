import { PrismaPg } from "@prisma/adapter-pg";

export type PrismaAgentApiKeyRecord = {
  id: string;
  keyPrefix: string;
  keyHash: string;
  agentId: string;
  organizationId: string;
  agent: {
    status: "ACTIVE" | "DISABLED";
  };
};

export type PrismaPolicyRecord = {
  id: string;
  organizationId: string;
  connectorId: string | null;
  name: string;
  decision: "ALLOW" | "DENY" | "APPROVAL_REQUIRED";
  priority: number;
  status: "DRAFT" | "ACTIVE" | "DISABLED" | "ARCHIVED";
  rules: unknown;
};

export type AuthRailPrismaTransactionClient = {
  actionRequest: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  auditEvent: {
    createMany: (args: unknown) => Promise<unknown>;
  };
};

export type AuthRailPrismaClient = AuthRailPrismaTransactionClient & {
  agentApiKey: {
    findMany: (args: unknown) => Promise<PrismaAgentApiKeyRecord[]>;
  };
  policy: {
    findMany: (args: unknown) => Promise<PrismaPolicyRecord[]>;
  };
  $transaction: <Result>(
    callback: (tx: AuthRailPrismaTransactionClient) => Promise<Result>,
  ) => Promise<Result>;
};

type PrismaClientConstructor = new (options: {
  adapter: PrismaPg;
}) => AuthRailPrismaClient;

const globalForPrisma = globalThis as typeof globalThis & {
  authRailPrisma?: AuthRailPrismaClient;
};

export async function getPrismaClient(): Promise<AuthRailPrismaClient> {
  if (globalForPrisma.authRailPrisma) {
    return globalForPrisma.authRailPrisma;
  }

  const databaseUrl = process.env["DATABASE_URL"];

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to create the Prisma client.");
  }

  const generatedClientPath = "../../generated/prisma/client";
  const { PrismaClient } = (await import(generatedClientPath)) as {
    PrismaClient: PrismaClientConstructor;
  };
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  if (process.env["NODE_ENV"] !== "production") {
    globalForPrisma.authRailPrisma = prisma;
  }

  return prisma;
}
