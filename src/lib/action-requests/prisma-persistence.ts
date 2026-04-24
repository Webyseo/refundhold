import type {
  ActionRequestPersistence,
  PersistedActionRequestInput,
  StoredAgentApiKey,
  StoredPolicy,
} from "./handler";
import type {
  AuthRailPrismaClient,
  AuthRailPrismaTransactionClient,
  PrismaAgentApiKeyRecord,
  PrismaPolicyRecord,
} from "../db/prisma";

export function createPrismaActionRequestPersistence(
  prisma: AuthRailPrismaClient,
): ActionRequestPersistence {
  return {
    findActiveAgentApiKeyByPrefix: async (keyPrefix) => {
      const records = await prisma.agentApiKey.findMany({
        where: {
          keyPrefix,
          status: "ACTIVE",
          revokedAt: null,
          OR: [
            {
              expiresAt: null,
            },
            {
              expiresAt: {
                gt: new Date(),
              },
            },
          ],
          agent: {
            status: "ACTIVE",
          },
        },
        take: 2,
        select: {
          id: true,
          keyPrefix: true,
          keyHash: true,
          agentId: true,
          organizationId: true,
          agent: {
            select: {
              status: true,
            },
          },
        },
      });

      if (records.length > 1) {
        throw new Error("Ambiguous active agent API key prefix.");
      }

      return records[0] ? toStoredAgentApiKey(records[0]) : null;
    },
    listActivePoliciesForOrganization: async (organizationId) => {
      const records = await prisma.policy.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
        },
        orderBy: [
          {
            priority: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        select: {
          id: true,
          organizationId: true,
          connectorId: true,
          name: true,
          decision: true,
          priority: true,
          status: true,
          rules: true,
        },
      });

      return records.map(toStoredPolicy);
    },
    createActionRequestWithAudit: async (input) => {
      return createActionRequestWithAudit(prisma, input);
    },
  };
}

function toStoredAgentApiKey(
  record: PrismaAgentApiKeyRecord,
): StoredAgentApiKey {
  return {
    id: record.id,
    keyPrefix: record.keyPrefix,
    keyHash: record.keyHash,
    agentId: record.agentId,
    organizationId: record.organizationId,
    agentStatus: record.agent.status,
  };
}

function toStoredPolicy(record: PrismaPolicyRecord): StoredPolicy {
  return {
    id: record.id,
    organizationId: record.organizationId,
    connectorId: record.connectorId,
    name: record.name,
    decision: record.decision,
    priority: record.priority,
    status: record.status,
    rules: record.rules,
  };
}

async function createActionRequestWithAudit(
  prisma: AuthRailPrismaClient,
  input: PersistedActionRequestInput,
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    return persistActionRequestWithAudit(tx, input);
  });
}

async function persistActionRequestWithAudit(
  tx: AuthRailPrismaTransactionClient,
  input: PersistedActionRequestInput,
): Promise<{ id: string }> {
  const actionRequest = await tx.actionRequest.create({
    data: {
      organizationId: input.organizationId,
      agentId: input.agentId,
      connectorId: input.connectorId,
      policyId: input.policyId,
      operation: input.operation,
      resource: input.resource,
      parameters: input.parameters,
      context: input.context,
      requestPayload: input.requestPayload,
      decision: input.decision,
      status: input.status,
      decisionReason: input.decisionReason,
      decidedAt: new Date(),
    },
    select: {
      id: true,
    },
  });

  await tx.auditEvent.createMany({
    data: input.auditEvents.map((event) => {
      return {
        organizationId: input.organizationId,
        actionRequestId: actionRequest.id,
        agentId: event.agentId,
        actorType: event.actorType,
        type: event.type,
        metadata: event.metadata,
      };
    }),
  });

  return actionRequest;
}
