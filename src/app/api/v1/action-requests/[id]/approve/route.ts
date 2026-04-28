import {
  handleApprovalDecision,
  type ApprovalDecisionPersistence,
} from "@/lib/approvals/handler";
import { createPrismaApprovalDecisionPersistence } from "@/lib/approvals/prisma-persistence";
import { resolveHumanActionActor } from "@/lib/auth/action-actor";
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

  const actorResult = await resolveHumanActionActor({
    request,
    requiredPermission: "reviewActionRequests",
  });

  if (!actorResult.ok) {
    return Response.json(actorResult.response.body, {
      status: actorResult.response.status,
    });
  }

  const response = await handleApprovalDecision({
    action: "approve",
    actionRequestId: id,
    body,
    actor: actorResult.actor,
    reviewerEmailHeader: request.headers.get("x-refundhold-reviewer-email"),
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

function createLazyPrismaPersistence(): ApprovalDecisionPersistence {
  let persistencePromise: Promise<ApprovalDecisionPersistence> | null = null;

  async function getPersistence() {
    persistencePromise ??= getPrismaClient().then((prisma) => {
      return createPrismaApprovalDecisionPersistence(prisma);
    });

    return persistencePromise;
  }

  return {
    findActionRequestForReview: async (actionRequestId) => {
      const persistence = await getPersistence();

      return persistence.findActionRequestForReview(actionRequestId);
    },
    findReviewerByOrganizationAndEmail: async (input) => {
      const persistence = await getPersistence();

      return persistence.findReviewerByOrganizationAndEmail(input);
    },
    createApprovalDecision: async (input) => {
      const persistence = await getPersistence();

      return persistence.createApprovalDecision(input);
    },
  };
}
