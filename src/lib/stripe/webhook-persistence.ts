import type {
  StoredStripeRefundForWebhook,
  StripeWebhookProcessingPersistence,
} from "./webhooks";
import type {
  AuthRailPrismaClient,
  PrismaStripeRefundWebhookRecord,
} from "../db/prisma";

export function createPrismaStripeWebhookPersistence(
  prisma: AuthRailPrismaClient,
): StripeWebhookProcessingPersistence {
  return {
    createReceivedStripeWebhookEvent: async (input) => {
      const existing = await prisma.stripeWebhookEvent.findUnique({
        where: {
          stripeEventId: input.stripeEventId,
        },
        select: {
          id: true,
          stripeEventId: true,
          status: true,
        },
      });

      if (existing) {
        return {
          duplicate: true,
          status: existing.status,
        };
      }

      try {
        await prisma.stripeWebhookEvent.create({
          data: {
            stripeEventId: input.stripeEventId,
            mode: input.mode,
            livemode: input.livemode,
            type: input.type,
            objectId: input.objectId ?? null,
            payloadHash: input.payloadHash,
            safePayload: input.safePayload,
            status: "RECEIVED",
          },
          select: {
            id: true,
            stripeEventId: true,
            status: true,
          },
        });
      } catch (error) {
        const existingAfterCreateError =
          await prisma.stripeWebhookEvent.findUnique({
            where: {
              stripeEventId: input.stripeEventId,
            },
            select: {
              id: true,
              stripeEventId: true,
              status: true,
            },
          });

        if (existingAfterCreateError) {
          return {
            duplicate: true,
            status: existingAfterCreateError.status,
          };
        }

        throw error;
      }

      return {
        duplicate: false,
        status: "RECEIVED",
      };
    },
    markStripeWebhookEventIgnored: async ({ stripeEventId, errorMessage }) => {
      await prisma.stripeWebhookEvent.update({
        where: {
          stripeEventId,
        },
        data: {
          status: "IGNORED",
          errorMessage,
          processedAt: new Date(),
        },
      });
    },
    findStripeRefundForWebhook: async ({
      stripeRefundId,
      actionRequestId,
      executionId,
    }) => {
      const matchFilters = [
        {
          stripeRefundId,
        },
        ...(actionRequestId
          ? [
              {
                actionRequestId,
              },
            ]
          : []),
        ...(executionId
          ? [
              {
                executionId,
              },
            ]
          : []),
      ];
      const record = await prisma.stripeRefund.findFirst({
        where: {
          mode: "TEST",
          OR: matchFilters,
        },
        select: {
          id: true,
          organizationId: true,
          connectorId: true,
          actionRequestId: true,
          executionId: true,
          stripeRefundId: true,
          actionRequest: {
            select: {
              agentId: true,
            },
          },
        },
      });

      return record ? toStoredStripeRefundForWebhook(record) : null;
    },
    processStripeRefundWebhook: async (input) => {
      await prisma.$transaction(async (tx) => {
        await tx.stripeRefund.update({
          where: {
            id: input.stripeRefundRecordId,
          },
          data: {
            stripeStatus: input.stripeStatus,
            safeResponse: input.safeResponse,
          },
        });

        await tx.stripeWebhookEvent.update({
          where: {
            stripeEventId: input.stripeEventId,
          },
          data: {
            status: "PROCESSED",
            errorMessage: null,
            processedAt: new Date(),
          },
        });

        await tx.auditEvent.createMany({
          data: [
            {
              organizationId: input.organizationId,
              actionRequestId: input.actionRequestId,
              executionId: input.executionId,
              agentId: input.agentId,
              actorType: "SYSTEM",
              type: "STRIPE_WEBHOOK_RECEIVED",
              metadata: {
                event: "stripe_webhook_received",
                stripe_event_id: input.stripeEventId,
                livemode: false,
              },
            },
            ...input.auditEvents.map((event) => {
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
          ],
        });
      });
    },
  };
}

function toStoredStripeRefundForWebhook(
  record: PrismaStripeRefundWebhookRecord,
): StoredStripeRefundForWebhook {
  return {
    id: record.id,
    organizationId: record.organizationId,
    connectorId: record.connectorId,
    actionRequestId: record.actionRequestId,
    executionId: record.executionId,
    agentId: record.actionRequest.agentId,
    stripeRefundId: record.stripeRefundId,
  };
}
