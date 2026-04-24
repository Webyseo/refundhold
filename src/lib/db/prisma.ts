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

export type PrismaReviewActionRequestRecord = {
  id: string;
  organizationId: string;
  agentId: string;
  decision: "ALLOW" | "DENY" | "APPROVAL_REQUIRED" | null;
  status:
    | "PROPOSED"
    | "ALLOWED"
    | "DENIED"
    | "APPROVAL_REQUIRED"
    | "APPROVED"
    | "REJECTED"
    | "EXECUTING"
    | "EXECUTED"
    | "FAILED"
    | "CANCELED";
};

export type PrismaReviewerRecord = {
  id: string;
  organizationId: string;
  email: string;
  status: "ACTIVE" | "DISABLED";
};

export type PrismaExecutableActionRequestRecord = {
  id: string;
  organizationId: string;
  agentId: string;
  connectorId?: string | null;
  decision: "ALLOW" | "DENY" | "APPROVAL_REQUIRED" | null;
  status:
    | "PROPOSED"
    | "ALLOWED"
    | "DENIED"
    | "APPROVAL_REQUIRED"
    | "APPROVED"
    | "REJECTED"
    | "EXECUTING"
    | "EXECUTED"
    | "FAILED"
    | "CANCELED";
};

export type PrismaDashboardAgentRecord = {
  id: string;
  name: string;
};

export type PrismaDashboardConnectorRecord = {
  id: string;
  name: string;
  type: string;
};

export type PrismaDashboardUserRecord = {
  id: string;
  email: string;
  displayName: string | null;
};

export type PrismaDashboardActionRequestListRecord =
  PrismaExecutableActionRequestRecord & {
    operation: string;
    parameters: unknown;
    createdAt: Date;
    agent: PrismaDashboardAgentRecord;
    connector: PrismaDashboardConnectorRecord | null;
  };

export type PrismaDashboardApprovalRecord = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED" | "EXPIRED";
  reason: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  reviewer: PrismaDashboardUserRecord | null;
};

export type PrismaDashboardExecutionRecord = {
  id: string;
  mode: "DRY_RUN" | "DIRECT" | "GRANT";
  status:
    | "PENDING"
    | "GRANT_ISSUED"
    | "RUNNING"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELED";
  responsePayload: unknown;
  errorMetadata: unknown;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

export type PrismaDashboardAuditEventRecord = {
  id: string;
  actorType: "USER" | "AGENT" | "SYSTEM";
  type:
    | "ACTION_PROPOSED"
    | "REQUEST_RECEIVED"
    | "POLICY_EVALUATED"
    | "DECISION_CREATED"
    | "APPROVAL_REQUESTED"
    | "APPROVAL_APPROVED"
    | "APPROVAL_REJECTED"
    | "EXECUTION_GRANT_ISSUED"
    | "EXECUTION_STARTED"
    | "EXECUTION_SUCCEEDED"
    | "EXECUTION_FAILED";
  metadata: unknown;
  createdAt: Date;
  agent: PrismaDashboardAgentRecord | null;
  user: PrismaDashboardUserRecord | null;
};

export type PrismaDashboardActionRequestDetailRecord =
  PrismaDashboardActionRequestListRecord & {
    resource: unknown;
    context: unknown;
    requestPayload: unknown;
    decisionReason: string | null;
    decidedAt: Date | null;
    updatedAt: Date;
    approvals: PrismaDashboardApprovalRecord[];
    executions: PrismaDashboardExecutionRecord[];
    auditEvents: PrismaDashboardAuditEventRecord[];
  };

export type AuthRailPrismaTransactionClient = {
  actionRequest: {
    create: (args: unknown) => Promise<{ id: string }>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
  };
  approval: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  execution: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  auditEvent: {
    create: (args: unknown) => Promise<unknown>;
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
  actionRequest: AuthRailPrismaTransactionClient["actionRequest"] & {
    findMany: (
      args: unknown,
    ) => Promise<PrismaDashboardActionRequestListRecord[]>;
    findUnique: (
      args: unknown,
    ) => Promise<
      | PrismaReviewActionRequestRecord
      | PrismaExecutableActionRequestRecord
      | PrismaDashboardActionRequestDetailRecord
      | null
    >;
  };
  user: {
    findFirst: (args: unknown) => Promise<PrismaReviewerRecord | null>;
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
