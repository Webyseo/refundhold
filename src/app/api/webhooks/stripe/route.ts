import { getPrismaClient } from "@/lib/db/prisma";
import { handleStripeWebhookRequest } from "@/lib/stripe/webhook-route";
import { createPrismaStripeWebhookPersistence } from "@/lib/stripe/webhook-persistence";
import {
  handleStripeWebhookEvent,
  type StripeWebhookProcessingPersistence,
} from "@/lib/stripe/webhooks";

export async function POST(request: Request) {
  const response = await handleStripeWebhookRequest({
    request,
    processEvent: async ({ event, rawBody }) => {
      return handleStripeWebhookEvent({
        event,
        rawBody,
        persistence: createLazyStripeWebhookPersistence(),
      });
    },
  });

  return Response.json(response.body, {
    status: response.status,
  });
}

function createLazyStripeWebhookPersistence(): StripeWebhookProcessingPersistence {
  let persistencePromise: Promise<StripeWebhookProcessingPersistence> | null =
    null;

  async function getPersistence() {
    persistencePromise ??= getPrismaClient().then((prisma) => {
      return createPrismaStripeWebhookPersistence(prisma);
    });

    return persistencePromise;
  }

  return {
    createReceivedStripeWebhookEvent: async (input) => {
      const persistence = await getPersistence();

      return persistence.createReceivedStripeWebhookEvent(input);
    },
    markStripeWebhookEventIgnored: async (input) => {
      const persistence = await getPersistence();

      return persistence.markStripeWebhookEventIgnored(input);
    },
    findStripeRefundForWebhook: async (input) => {
      const persistence = await getPersistence();

      return persistence.findStripeRefundForWebhook(input);
    },
    processStripeRefundWebhook: async (input) => {
      const persistence = await getPersistence();

      return persistence.processStripeRefundWebhook(input);
    },
  };
}
