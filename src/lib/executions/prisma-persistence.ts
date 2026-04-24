import type {
  DryRunExecutionPersistence,
  PersistedDryRunExecutionInput,
  StoredExecutableActionRequest,
} from "./handler";
import type {
  AuthRailPrismaClient,
  AuthRailPrismaTransactionClient,
  PrismaExecutableActionRequestRecord,
} from "../db/prisma";

export function createPrismaDryRunExecutionPersistence(
  prisma: AuthRailPrismaClient,
): DryRunExecutionPersistence {
  return {
    findActionRequestForExecution: async (actionRequestId) => {
      const record = await prisma.actionRequest.findUnique({
        where: {
          id: actionRequestId,
        },
        select: {
          id: true,
          organizationId: true,
          agentId: true,
          connectorId: true,
          decision: true,
          status: true,
        },
      });

      return record ? toStoredActionRequest(record) : null;
    },
    createDryRunExecution: async (input) => {
      return createDryRunExecution(prisma, input);
    },
  };
}

function toStoredActionRequest(
  record: PrismaExecutableActionRequestRecord,
): StoredExecutableActionRequest {
  return {
    id: record.id,
    organizationId: record.organizationId,
    agentId: record.agentId,
    connectorId: record.connectorId ?? null,
    decision: record.decision,
    status: record.status,
  };
}

async function createDryRunExecution(
  prisma: AuthRailPrismaClient,
  input: PersistedDryRunExecutionInput,
): Promise<{ executionId: string } | null> {
  return prisma.$transaction(async (tx) => {
    return persistDryRunExecution(tx, input);
  });
}

async function persistDryRunExecution(
  tx: AuthRailPrismaTransactionClient,
  input: PersistedDryRunExecutionInput,
): Promise<{ executionId: string } | null> {
  const startedAt = new Date();
  const updateResult = await tx.actionRequest.updateMany({
    where: {
      id: input.actionRequestId,
      organizationId: input.organizationId,
      decision: "APPROVAL_REQUIRED",
      status: "APPROVED",
    },
    data: {
      status: "EXECUTING",
    },
  });

  if (updateResult.count !== 1) {
    return null;
  }

  const execution = await tx.execution.create({
    data: {
      organizationId: input.organizationId,
      actionRequestId: input.actionRequestId,
      connectorId: input.connectorId,
      mode: input.mode,
      status: input.status,
      responsePayload: {
        execution_mode: "dry_run",
        message: "Dry-run execution completed.",
        metadata: input.metadata,
      },
      startedAt,
      completedAt: new Date(),
    },
    select: {
      id: true,
    },
  });

  await tx.auditEvent.createMany({
    data: input.auditEvents.map((event) => {
      return {
        organizationId: input.organizationId,
        actionRequestId: input.actionRequestId,
        executionId: execution.id,
        agentId: input.agentId,
        actorType: "SYSTEM",
        type: event.type,
        metadata: event.metadata,
      };
    }),
  });

  await tx.actionRequest.updateMany({
    where: {
      id: input.actionRequestId,
      organizationId: input.organizationId,
      status: "EXECUTING",
    },
    data: {
      status: "EXECUTED",
    },
  });

  return {
    executionId: execution.id,
  };
}
