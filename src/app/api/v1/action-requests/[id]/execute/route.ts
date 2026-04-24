import {
  handleDryRunExecution,
  type DryRunExecutionPersistence,
} from "@/lib/executions/handler";
import { createPrismaDryRunExecutionPersistence } from "@/lib/executions/prisma-persistence";
import { getPrismaClient } from "@/lib/db/prisma";

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

  const response = await handleDryRunExecution({
    actionRequestId: id,
    body,
    persistence: createLazyPrismaPersistence(),
  });

  return Response.json(response.body, {
    status: response.status,
  });
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
