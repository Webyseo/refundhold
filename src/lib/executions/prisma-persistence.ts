import type {
  DryRunExecutionPersistence,
  PersistedDryRunExecutionInput,
  StoredExecutableActionRequest,
} from "./handler";
import type {
  BeginStripeTestRefundExecutionInput,
  MarkStripeTestRefundExecutionFailedInput,
  MarkStripeTestRefundExecutionSucceededInput,
  StoredStripePaymentObjectForRefund,
  StoredStripeRefundExecutableActionRequest,
  StripeTestRefundExecutionPersistence,
} from "../stripe/refund-execution";
import type {
  AuthRailPrismaClient,
  AuthRailPrismaTransactionClient,
  PrismaExecutableActionRequestRecord,
  PrismaStripePaymentObjectRecord,
  PrismaStripeRefundActionRequestRecord,
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
          connector: {
            select: {
              type: true,
            },
          },
          decision: true,
          status: true,
          operation: true,
          resource: true,
          parameters: true,
        },
      });

      return record ? toStoredActionRequest(record) : null;
    },
    createDryRunExecution: async (input) => {
      return createDryRunExecution(prisma, input);
    },
  };
}

export function createPrismaStripeTestRefundExecutionPersistence(
  prisma: AuthRailPrismaClient,
): StripeTestRefundExecutionPersistence {
  return {
    findActionRequestForStripeRefundExecution: async (actionRequestId) => {
      const record = await prisma.actionRequest.findUnique({
        where: {
          id: actionRequestId,
        },
        select: {
          id: true,
          organizationId: true,
          agentId: true,
          connectorId: true,
          connector: {
            select: {
              type: true,
            },
          },
          decision: true,
          status: true,
          operation: true,
          resource: true,
          parameters: true,
          approvals: {
            where: {
              status: "APPROVED",
            },
            orderBy: {
              reviewedAt: "desc",
            },
            take: 1,
            select: {
              id: true,
            },
          },
          executions: {
            where: {
              status: "SUCCEEDED",
            },
            take: 1,
            select: {
              id: true,
              status: true,
            },
          },
          stripeRefund: {
            select: {
              id: true,
              stripeRefundId: true,
              stripeStatus: true,
            },
          },
        },
      });

      if (!record) {
        return null;
      }

      const stripeRecord = record as PrismaStripeRefundActionRequestRecord;
      const stripePaymentObject = stripeRecord.connectorId
        ? await findStripePaymentObjectForActionRequest(prisma, stripeRecord)
        : null;

      return toStoredStripeRefundActionRequest(
        stripeRecord,
        stripePaymentObject,
      );
    },
    beginStripeTestRefundExecution: async (input) => {
      return beginStripeTestRefundExecution(prisma, input);
    },
    markStripeTestRefundExecutionSucceeded: async (input) => {
      await markStripeTestRefundExecutionSucceeded(prisma, input);
    },
    markStripeTestRefundExecutionFailed: async (input) => {
      await markStripeTestRefundExecutionFailed(prisma, input);
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
    connectorType: record.connector?.type ?? null,
    decision: record.decision,
    status: record.status,
    operation: record.operation,
    resource: isJsonObject(record.resource)
      ? (record.resource as StoredExecutableActionRequest["resource"])
      : undefined,
    parameters: isJsonObject(record.parameters)
      ? (record.parameters as StoredExecutableActionRequest["parameters"])
      : undefined,
  };
}

function toStoredStripeRefundActionRequest(
  record: PrismaStripeRefundActionRequestRecord,
  stripePaymentObject: StoredStripePaymentObjectForRefund | null,
): StoredStripeRefundExecutableActionRequest {
  return {
    id: record.id,
    organizationId: record.organizationId,
    agentId: record.agentId,
    connectorId: record.connectorId ?? "",
    connectorType: record.connector?.type ?? "",
    decision: record.decision,
    status: record.status,
    operation: record.operation,
    resource: toJsonObject(record.resource),
    parameters: toJsonObject(record.parameters),
    approvedApprovalId: record.approvals[0]?.id ?? null,
    stripePaymentObject,
    existingStripeRefund: record.stripeRefund,
    completedExecution: record.executions[0] ?? null,
  };
}

function toStoredStripePaymentObject(
  record: PrismaStripePaymentObjectRecord,
): StoredStripePaymentObjectForRefund {
  return {
    id: record.id,
    organizationId: record.organizationId,
    connectorId: record.connectorId,
    mode: record.mode,
    paymentIntentId: record.paymentIntentId ?? undefined,
    chargeId: record.chargeId ?? undefined,
    amountMinor: record.amountMinor,
    amountRefundedMinor: record.amountRefundedMinor,
    currency: record.currency,
    status: record.status,
    livemode: record.livemode,
    safeSnapshot: toJsonObject(record.safeSnapshot),
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

async function findStripePaymentObjectForActionRequest(
  prisma: AuthRailPrismaClient,
  record: PrismaStripeRefundActionRequestRecord,
): Promise<StoredStripePaymentObjectForRefund | null> {
  const resource = toJsonObject(record.resource);
  const parameters = toJsonObject(record.parameters);
  const paymentIntentId =
    readOptionalString(parameters["payment_intent_id"]) ??
    readOptionalString(resource["payment_intent_id"]);
  const chargeId =
    readOptionalString(parameters["charge_id"]) ??
    readOptionalString(resource["charge_id"]);
  const targetFilters = [
    ...(paymentIntentId
      ? [
          {
            paymentIntentId,
          },
        ]
      : []),
    ...(chargeId
      ? [
          {
            chargeId,
          },
        ]
      : []),
  ];

  if (targetFilters.length === 0 || !record.connectorId) {
    return null;
  }

  const recordOrId = await prisma.stripePaymentObject.findFirst({
    where: {
      organizationId: record.organizationId,
      connectorId: record.connectorId,
      mode: "TEST",
      OR: targetFilters,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      organizationId: true,
      connectorId: true,
      mode: true,
      paymentIntentId: true,
      chargeId: true,
      amountMinor: true,
      amountRefundedMinor: true,
      currency: true,
      status: true,
      livemode: true,
      safeSnapshot: true,
    },
  });

  if (!recordOrId || !("organizationId" in recordOrId)) {
    return null;
  }

  return toStoredStripePaymentObject(recordOrId);
}

async function beginStripeTestRefundExecution(
  prisma: AuthRailPrismaClient,
  input: BeginStripeTestRefundExecutionInput,
): Promise<{ executionId: string } | null> {
  return prisma.$transaction(async (tx) => {
    return persistStripeTestRefundStart(tx, input);
  });
}

async function persistStripeTestRefundStart(
  tx: AuthRailPrismaTransactionClient,
  input: BeginStripeTestRefundExecutionInput,
): Promise<{ executionId: string } | null> {
  const existingStripeRefund = await tx.stripeRefund.findUnique({
    where: {
      actionRequestId: input.actionRequestId,
    },
    select: {
      id: true,
      stripeRefundId: true,
      stripeStatus: true,
    },
  });

  if (existingStripeRefund) {
    return null;
  }

  const existingCompletedExecution = await tx.execution.findFirst({
    where: {
      actionRequestId: input.actionRequestId,
      status: "SUCCEEDED",
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (existingCompletedExecution) {
    return null;
  }

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

  const startedAt = new Date();
  const execution = await tx.execution.create({
    data: {
      id: input.executionId,
      organizationId: input.organizationId,
      actionRequestId: input.actionRequestId,
      connectorId: input.connectorId,
      mode: input.mode,
      status: input.executionStatus,
      responsePayload: {
        execution_mode: "stripe_test_refund",
      },
      startedAt,
    },
    select: {
      id: true,
    },
  });

  await tx.stripeRefund.create({
    data: {
      organizationId: input.organizationId,
      connectorId: input.connectorId,
      actionRequestId: input.actionRequestId,
      executionId: execution.id,
      mode: input.stripeMode,
      stripeRefundId: null,
      paymentIntentId: input.paymentIntentId ?? null,
      chargeId: input.chargeId ?? null,
      amountMinor: input.amountMinor,
      currency: input.currency,
      reason: input.reason ?? null,
      stripeStatus: input.stripeRefundStatus,
      idempotencyKeyHash: input.idempotencyKeyHash,
      stripeRequestId: null,
      safeResponse: null,
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

  return {
    executionId: execution.id,
  };
}

async function markStripeTestRefundExecutionSucceeded(
  prisma: AuthRailPrismaClient,
  input: MarkStripeTestRefundExecutionSucceededInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const completedAt = new Date();

    await tx.stripeRefund.update({
      where: {
        executionId: input.executionId,
      },
      data: {
        stripeRefundId: input.stripeRefundId,
        stripeStatus: input.stripeStatus,
        stripeRequestId: input.stripeRequestId ?? null,
        safeResponse: input.safeResponse,
      },
    });

    await tx.execution.update({
      where: {
        id: input.executionId,
      },
      data: {
        status: "SUCCEEDED",
        responsePayload: input.safeResponse,
        completedAt,
      },
    });

    await tx.auditEvent.createMany({
      data: input.auditEvents.map((event) => {
        return {
          organizationId: input.organizationId,
          actionRequestId: input.actionRequestId,
          executionId: input.executionId,
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
  });
}

async function markStripeTestRefundExecutionFailed(
  prisma: AuthRailPrismaClient,
  input: MarkStripeTestRefundExecutionFailedInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const completedAt = new Date();

    await tx.stripeRefund.update({
      where: {
        executionId: input.executionId,
      },
      data: {
        stripeStatus: input.stripeStatus,
        safeResponse: input.safeError,
      },
    });

    await tx.execution.update({
      where: {
        id: input.executionId,
      },
      data: {
        status: "FAILED",
        errorMetadata: input.safeError,
        completedAt,
      },
    });

    await tx.auditEvent.createMany({
      data: input.auditEvents.map((event) => {
        return {
          organizationId: input.organizationId,
          actionRequestId: input.actionRequestId,
          executionId: input.executionId,
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
        status: "FAILED",
      },
    });
  });
}

function toJsonObject(
  value: unknown,
): StoredStripeRefundExecutableActionRequest["resource"] {
  return isJsonObject(value)
    ? (value as StoredStripeRefundExecutableActionRequest["resource"])
    : {};
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}
