import {
  handleDryRunExecution,
  type DryRunExecutionPersistence,
} from "@/lib/executions/handler";
import {
  createPrismaDryRunExecutionPersistence,
  createPrismaStripeTestRefundExecutionPersistence,
} from "@/lib/executions/prisma-persistence";
import { resolveHumanActionActor } from "@/lib/auth/action-actor";
import { getPrismaClient } from "@/lib/db/prisma";
import {
  executeStripeTestRefundForActionRequest,
  type StripeTestRefundExecutionPersistence,
} from "@/lib/stripe/refund-execution";

const invalidJsonResponse = {
  error: "invalid_payload",
  message: "Request body is invalid.",
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await readOptionalJsonBody(request);

  if (body === invalidJsonResponse) {
    return Response.json(invalidJsonResponse, {
      status: 400,
    });
  }

  const actorResult = await resolveHumanActionActor({
    request,
    requiredPermission: "executeRefunds",
  });

  if (!actorResult.ok) {
    return Response.json(actorResult.response.body, {
      status: actorResult.response.status,
    });
  }

  const response = await handleDryRunExecution({
    actionRequestId: id,
    body,
    actor: actorResult.actor,
    persistence: createLazyPrismaPersistence(),
    stripeRefundExecutor: async ({ actionRequestId, actor }) => {
      return executeStripeTestRefundForActionRequest({
        actionRequestId,
        actor,
        persistence: createLazyStripeRefundPersistence(),
      });
    },
  });

  return Response.json(response.body, {
    status: response.status,
  });
}

function createLazyStripeRefundPersistence(): StripeTestRefundExecutionPersistence {
  let persistencePromise: Promise<StripeTestRefundExecutionPersistence> | null =
    null;

  async function getPersistence() {
    persistencePromise ??= getPrismaClient().then((prisma) => {
      return createPrismaStripeTestRefundExecutionPersistence(prisma);
    });

    return persistencePromise;
  }

  return {
    findActionRequestForStripeRefundExecution: async (actionRequestId) => {
      const persistence = await getPersistence();

      return persistence.findActionRequestForStripeRefundExecution(
        actionRequestId,
      );
    },
    beginStripeTestRefundExecution: async (input) => {
      const persistence = await getPersistence();

      return persistence.beginStripeTestRefundExecution(input);
    },
    markStripeTestRefundExecutionSucceeded: async (input) => {
      const persistence = await getPersistence();

      return persistence.markStripeTestRefundExecutionSucceeded(input);
    },
    markStripeTestRefundExecutionFailed: async (input) => {
      const persistence = await getPersistence();

      return persistence.markStripeTestRefundExecutionFailed(input);
    },
  };
}

async function readOptionalJsonBody(request: Request) {
  const rawBody = await request.text();

  if (rawBody.trim().length === 0) {
    return {};
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return invalidJsonResponse;
  }
}

function createLazyPrismaPersistence(): DryRunExecutionPersistence {
  let persistencePromise: Promise<DryRunExecutionPersistence> | null = null;

  async function getPersistence() {
    persistencePromise ??= getPrismaClient().then((prisma) => {
      return createPrismaDryRunExecutionPersistence(prisma);
    });

    return persistencePromise;
  }

  return {
    findActionRequestForExecution: async (actionRequestId) => {
      const persistence = await getPersistence();

      return persistence.findActionRequestForExecution(actionRequestId);
    },
    createDryRunExecution: async (input) => {
      const persistence = await getPersistence();

      return persistence.createDryRunExecution(input);
    },
  };
}
