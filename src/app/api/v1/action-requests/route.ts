import {
  handleActionRequest,
  type ActionRequestPersistence,
} from "@/lib/action-requests/handler";
import { createPrismaActionRequestPersistence } from "@/lib/action-requests/prisma-persistence";
import { getPrismaClient } from "@/lib/db/prisma";

const invalidJsonResponse = {
  error: "invalid_payload",
  message: "Request body is invalid.",
};

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(invalidJsonResponse, {
      status: 400,
    });
  }

  const response = await handleActionRequest({
    authorizationHeader: request.headers.get("authorization"),
    body,
    persistence: createLazyPrismaPersistence(),
  });

  return Response.json(response.body, {
    status: response.status,
  });
}

function createLazyPrismaPersistence(): ActionRequestPersistence {
  let persistencePromise: Promise<ActionRequestPersistence> | null = null;

  async function getPersistence() {
    persistencePromise ??= getPrismaClient().then((prisma) => {
      return createPrismaActionRequestPersistence(prisma);
    });

    return persistencePromise;
  }

  return {
    findActiveAgentApiKeyByPrefix: async (keyPrefix) => {
      const persistence = await getPersistence();

      return persistence.findActiveAgentApiKeyByPrefix(keyPrefix);
    },
    listActivePoliciesForOrganization: async (organizationId) => {
      const persistence = await getPersistence();

      return persistence.listActivePoliciesForOrganization(organizationId);
    },
    createActionRequestWithAudit: async (input) => {
      const persistence = await getPersistence();

      return persistence.createActionRequestWithAudit(input);
    },
  };
}
