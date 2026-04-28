import { getPrismaClient } from "@/lib/db/prisma";
import type {
  AuthRailPrismaClient,
  PrismaDashboardActionRequestDetailRecord,
  PrismaDashboardActionRequestListRecord,
  PrismaStripePaymentObjectRecord,
} from "@/lib/db/prisma";

const webhookReconciliationAuditTypes = [
  "STRIPE_WEBHOOK_PROCESSED",
  "STRIPE_REFUND_STATUS_UPDATED",
  "STRIPE_REFUND_FAILED",
];

export async function listDashboardActionRequests({
  organizationId,
}: {
  organizationId: string;
}) {
  const prisma = await getPrismaClient();

  return prisma.actionRequest.findMany({
    where: {
      organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    select: {
      id: true,
      organizationId: true,
      agentId: true,
      connectorId: true,
      operation: true,
      resource: true,
      parameters: true,
      decision: true,
      status: true,
      createdAt: true,
      agent: {
        select: {
          id: true,
          name: true,
        },
      },
      connector: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      stripeRefund: {
        select: {
          id: true,
          stripeRefundId: true,
          stripeStatus: true,
        },
      },
      auditEvents: {
        where: {
          type: {
            in: webhookReconciliationAuditTypes,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          type: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function getDashboardActionRequest({
  actionRequestId,
  organizationId,
}: {
  actionRequestId: string;
  organizationId: string;
}) {
  const prisma = await getPrismaClient();
  const record = await prisma.actionRequest.findFirst({
    where: {
      id: actionRequestId,
      organizationId,
    },
    select: {
      id: true,
      organizationId: true,
      agentId: true,
      connectorId: true,
      operation: true,
      resource: true,
      parameters: true,
      context: true,
      requestPayload: true,
      decision: true,
      status: true,
      decisionReason: true,
      decidedAt: true,
      createdAt: true,
      updatedAt: true,
      agent: {
        select: {
          id: true,
          name: true,
        },
      },
      connector: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      approvals: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          status: true,
          reason: true,
          reviewedAt: true,
          createdAt: true,
          reviewer: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      },
      executions: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          mode: true,
          status: true,
          responsePayload: true,
          errorMetadata: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
      },
      stripeRefund: {
        select: {
          id: true,
          mode: true,
          stripeRefundId: true,
          paymentIntentId: true,
          chargeId: true,
          amountMinor: true,
          currency: true,
          reason: true,
          stripeStatus: true,
          createdAt: true,
          updatedAt: true,
          execution: {
            select: {
              id: true,
              status: true,
              startedAt: true,
              completedAt: true,
              createdAt: true,
            },
          },
        },
      },
      auditEvents: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          actorType: true,
          type: true,
          metadata: true,
          createdAt: true,
          agent: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  if (!record) {
    return null;
  }

  const detailRecord = record as PrismaDashboardActionRequestDetailRecord;
  const stripePaymentObject = await findDashboardStripePaymentObject(
    prisma,
    detailRecord,
  );
  const latestStripeWebhookEvent = await findLatestStripeWebhookEvent(
    prisma,
    detailRecord.stripeRefund?.stripeRefundId ?? null,
  );

  return {
    ...detailRecord,
    stripePaymentObject,
    latestStripeWebhookEvent,
  } satisfies PrismaDashboardActionRequestDetailRecord;
}

export type DashboardActionRequestListItem =
  PrismaDashboardActionRequestListRecord;
export type DashboardActionRequestDetail =
  PrismaDashboardActionRequestDetailRecord;

async function findDashboardStripePaymentObject(
  prisma: AuthRailPrismaClient,
  record: Pick<
    PrismaDashboardActionRequestDetailRecord,
    "organizationId" | "connectorId" | "resource" | "parameters"
  >,
): Promise<PrismaStripePaymentObjectRecord | null> {
  const paymentIntentId =
    readOptionalStringFromRecord(record.parameters, "payment_intent_id") ??
    readOptionalStringFromRecord(record.resource, "payment_intent_id");
  const chargeId =
    readOptionalStringFromRecord(record.parameters, "charge_id") ??
    readOptionalStringFromRecord(record.resource, "charge_id");
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

  if (!record.connectorId || targetFilters.length === 0) {
    return null;
  }

  const stripePaymentObject = await prisma.stripePaymentObject.findFirst({
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

  return stripePaymentObject && "organizationId" in stripePaymentObject
    ? stripePaymentObject
    : null;
}

async function findLatestStripeWebhookEvent(
  prisma: AuthRailPrismaClient,
  stripeRefundId: string | null,
) {
  if (!stripeRefundId) {
    return null;
  }

  return prisma.stripeWebhookEvent.findFirst({
    where: {
      objectId: stripeRefundId,
    },
    orderBy: {
      receivedAt: "desc",
    },
    select: {
      id: true,
      type: true,
      status: true,
      errorMessage: true,
      receivedAt: true,
      processedAt: true,
      safePayload: true,
    },
  });
}

function readOptionalStringFromRecord(
  value: unknown,
  key: string,
): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const field = value[key];

  return typeof field === "string" && field.trim().length > 0
    ? field.trim()
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
