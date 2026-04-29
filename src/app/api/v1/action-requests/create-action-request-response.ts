import {
  handleActionRequest,
  type ActionRequestPersistence,
  type HandleActionRequestResponse,
} from "@/lib/action-requests/handler";
import { createPrismaActionRequestPersistence } from "@/lib/action-requests/prisma-persistence";
import { getPrismaClient } from "@/lib/db/prisma";
import { reflectStripeTestPaymentObjectForRefund } from "@/lib/stripe/payment-reflection";

const invalidJsonResponse = {
  error: "invalid_payload",
  message: "Request body is invalid.",
};

export async function createActionRequestResponse({
  approvalUrlBasePath,
  body,
  request,
}: {
  approvalUrlBasePath?: string;
  body?: unknown;
  request: Request;
}): Promise<HandleActionRequestResponse> {
  let requestBody = body;

  if (requestBody === undefined) {
    try {
      requestBody = await request.json();
    } catch {
      return {
        status: 400,
        body: invalidJsonResponse,
      };
    }
  }

  return handleActionRequest({
    authorizationHeader: request.headers.get("authorization"),
    body: requestBody,
    persistence: createLazyPrismaPersistence(),
    approvalUrlBasePath,
    stripePaymentReflector: reflectStripeTestPaymentObjectForRefund,
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
    findActiveConnectorByOrganizationAndType: async (input) => {
      const persistence = await getPersistence();

      return persistence.findActiveConnectorByOrganizationAndType(input);
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
