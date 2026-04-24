import { getPrismaClient } from "@/lib/db/prisma";
import type {
  PrismaDashboardActionRequestDetailRecord,
  PrismaDashboardActionRequestListRecord,
} from "@/lib/db/prisma";

export async function listDashboardActionRequests() {
  const prisma = await getPrismaClient();

  return prisma.actionRequest.findMany({
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
    },
  });
}

export async function getDashboardActionRequest(actionRequestId: string) {
  const prisma = await getPrismaClient();
  const record = await prisma.actionRequest.findUnique({
    where: {
      id: actionRequestId,
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

  return record as PrismaDashboardActionRequestDetailRecord | null;
}

export type DashboardActionRequestListItem =
  PrismaDashboardActionRequestListRecord;
export type DashboardActionRequestDetail =
  PrismaDashboardActionRequestDetailRecord;
