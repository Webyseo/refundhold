import type {
  ApprovalDecisionPersistence,
  PersistedApprovalDecisionInput,
  StoredReviewActionRequest,
  StoredReviewer,
} from "./handler";
import type {
  AuthRailPrismaClient,
  AuthRailPrismaTransactionClient,
  PrismaReviewActionRequestRecord,
  PrismaReviewerRecord,
} from "../db/prisma";

export function createPrismaApprovalDecisionPersistence(
  prisma: AuthRailPrismaClient,
): ApprovalDecisionPersistence {
  return {
    findActionRequestForReview: async (actionRequestId) => {
      const record = await prisma.actionRequest.findUnique({
        where: {
          id: actionRequestId,
        },
        select: {
          id: true,
          organizationId: true,
          agentId: true,
          decision: true,
          status: true,
        },
      });

      return record ? toStoredActionRequest(record) : null;
    },
    findReviewerByOrganizationAndEmail: async ({ organizationId, email }) => {
      const record = await prisma.user.findFirst({
        where: {
          organizationId,
          email,
          status: "ACTIVE",
        },
        select: {
          id: true,
          organizationId: true,
          email: true,
          status: true,
        },
      });

      return record ? toStoredReviewer(record) : null;
    },
    createApprovalDecision: async (input) => {
      return createApprovalDecision(prisma, input);
    },
  };
}

function toStoredActionRequest(
  record: PrismaReviewActionRequestRecord,
): StoredReviewActionRequest {
  return {
    id: record.id,
    organizationId: record.organizationId,
    agentId: record.agentId,
    decision: record.decision,
    status: record.status,
  };
}

function toStoredReviewer(record: PrismaReviewerRecord): StoredReviewer {
  return {
    id: record.id,
    organizationId: record.organizationId,
    email: record.email,
    status: record.status,
  };
}

async function createApprovalDecision(
  prisma: AuthRailPrismaClient,
  input: PersistedApprovalDecisionInput,
): Promise<{ approvalId: string } | null> {
  return prisma.$transaction(async (tx) => {
    return persistApprovalDecision(tx, input);
  });
}

async function persistApprovalDecision(
  tx: AuthRailPrismaTransactionClient,
  input: PersistedApprovalDecisionInput,
): Promise<{ approvalId: string } | null> {
  const updateResult = await tx.actionRequest.updateMany({
    where: {
      id: input.actionRequestId,
      organizationId: input.organizationId,
      decision: "APPROVAL_REQUIRED",
      status: "APPROVAL_REQUIRED",
    },
    data: {
      status: input.actionRequestStatus,
    },
  });

  if (updateResult.count !== 1) {
    return null;
  }

  const approval = await tx.approval.create({
    data: {
      organizationId: input.organizationId,
      actionRequestId: input.actionRequestId,
      reviewerId: input.reviewerId,
      status: input.approvalStatus,
      reason: input.comment ?? null,
      reviewedAt: new Date(),
    },
    select: {
      id: true,
    },
  });

  await tx.auditEvent.create({
    data: {
      organizationId: input.organizationId,
      actionRequestId: input.actionRequestId,
      approvalId: approval.id,
      agentId: input.agentId,
      userId: input.reviewerId,
      actorType: "USER",
      type: input.auditEvent.type,
      metadata: input.auditEvent.metadata,
    },
  });

  return {
    approvalId: approval.id,
  };
}
