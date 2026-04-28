import { z } from "zod";

import {
  createHumanActorAuditMetadata,
  type HumanActionActor,
} from "../auth/action-actor";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

type JsonObject = {
  [key: string]: JsonValue;
};

export type ApprovalReviewAction = "approve" | "reject";
export type StoredAuthRailDecision = "ALLOW" | "DENY" | "APPROVAL_REQUIRED";
export type StoredActionRequestStatus =
  | "PROPOSED"
  | "ALLOWED"
  | "DENIED"
  | "APPROVAL_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "EXECUTING"
  | "EXECUTED"
  | "FAILED"
  | "CANCELED";
export type StoredApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELED"
  | "EXPIRED";
export type StoredUserStatus = "ACTIVE" | "DISABLED";
export type ApprovalAuditEventType =
  | "APPROVAL_APPROVED"
  | "APPROVAL_REJECTED";

export type StoredReviewActionRequest = {
  id: string;
  organizationId: string;
  agentId: string;
  decision: StoredAuthRailDecision | null;
  status: StoredActionRequestStatus;
};

export type StoredReviewer = {
  id: string;
  organizationId: string;
  email: string;
  status: StoredUserStatus;
};

export type PersistedApprovalDecisionInput = {
  actionRequestId: string;
  organizationId: string;
  agentId: string;
  reviewerId: string;
  approvalStatus: Extract<StoredApprovalStatus, "APPROVED" | "REJECTED">;
  actionRequestStatus: Extract<
    StoredActionRequestStatus,
    "APPROVED" | "REJECTED"
  >;
  comment?: string;
  auditEvent: {
    type: ApprovalAuditEventType;
    metadata: JsonObject;
  };
};

export type ApprovalDecisionPersistence = {
  findActionRequestForReview: (
    actionRequestId: string,
  ) => Promise<StoredReviewActionRequest | null>;
  findReviewerByOrganizationAndEmail: (input: {
    organizationId: string;
    email: string;
  }) => Promise<StoredReviewer | null>;
  createApprovalDecision: (
    input: PersistedApprovalDecisionInput,
  ) => Promise<{ approvalId: string } | null>;
};

export type HandleApprovalDecisionInput = {
  action: ApprovalReviewAction;
  actionRequestId: string;
  body: unknown;
  actor?: HumanActionActor;
  reviewerEmailHeader: string | null;
  persistence: ApprovalDecisionPersistence;
};

export type HandleApprovalDecisionResponse = {
  status: number;
  body: JsonObject;
};

// Demo-only reviewer identity for the MVP. This is not authentication.
// A production path must replace this header with real user auth.
export const reviewerEmailHeaderName = "X-RefundHold-Reviewer-Email";

const bodySchema = z
  .object({
    comment: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

const reviewerEmailSchema = z.string().trim().email().toLowerCase();

const decisionConfig = {
  approve: {
    approvalStatus: "APPROVED",
    actionRequestStatus: "APPROVED",
    responseDecision: "approved",
    reason: "Action request approved.",
    auditEventType: "APPROVAL_APPROVED",
    auditEventName: "approval_approved",
  },
  reject: {
    approvalStatus: "REJECTED",
    actionRequestStatus: "REJECTED",
    responseDecision: "rejected",
    reason: "Action request rejected.",
    auditEventType: "APPROVAL_REJECTED",
    auditEventName: "approval_rejected",
  },
} as const;

export async function handleApprovalDecision({
  action,
  actionRequestId,
  body,
  actor,
  reviewerEmailHeader,
  persistence,
}: HandleApprovalDecisionInput): Promise<HandleApprovalDecisionResponse> {
  const parsedBody = bodySchema.safeParse(body);

  if (!parsedBody.success || actionRequestId.trim().length === 0) {
    return {
      status: 400,
      body: {
        error: "invalid_payload",
        message: "Request body is invalid.",
      },
    };
  }

  if (actor && !actor.permissions.reviewActionRequests) {
    return forbiddenResponse("You do not have permission to perform this action.");
  }

  let reviewerEmail: string | null = null;

  if (!actor) {
    const parsedReviewerEmail = reviewerEmailSchema.safeParse(
      reviewerEmailHeader ?? "",
    );

    if (!parsedReviewerEmail.success) {
      return unauthorizedResponse(
        `${reviewerEmailHeaderName} header is required.`,
      );
    }

    reviewerEmail = parsedReviewerEmail.data;
  }

  let actionRequest: StoredReviewActionRequest | null;

  try {
    actionRequest =
      await persistence.findActionRequestForReview(actionRequestId);
  } catch {
    return failedClosedResponse("Action request lookup failed.");
  }

  if (!actionRequest) {
    return {
      status: 404,
      body: {
        error: "not_found",
        message: "Action request was not found.",
      },
    };
  }

  let reviewer: StoredReviewer | null;

  if (actor) {
    if (actor.organizationId !== actionRequest.organizationId) {
      return notFoundResponse();
    }

    reviewer = {
      id: actor.domainUserId,
      organizationId: actor.organizationId,
      email: actor.email,
      status: "ACTIVE",
    };
  } else {
    if (!reviewerEmail) {
      return unauthorizedResponse(
        `${reviewerEmailHeaderName} header is required.`,
      );
    }

    try {
      reviewer = await persistence.findReviewerByOrganizationAndEmail({
        organizationId: actionRequest.organizationId,
        email: reviewerEmail,
      });
    } catch {
      return failedClosedResponse("Reviewer lookup failed.");
    }
  }

  if (
    !reviewer ||
    reviewer.organizationId !== actionRequest.organizationId ||
    reviewer.status !== "ACTIVE"
  ) {
    return {
      status: 403,
      body: {
        error: "forbidden",
        message: "Reviewer is not authorized for this organization.",
      },
    };
  }

  const reviewabilityError = getReviewabilityError(actionRequest);

  if (reviewabilityError) {
    return reviewabilityError;
  }

  const config = decisionConfig[action];
  const comment = parsedBody.data.comment;

  let approvalDecision: { approvalId: string } | null;

  try {
    approvalDecision = await persistence.createApprovalDecision({
      actionRequestId: actionRequest.id,
      organizationId: actionRequest.organizationId,
      agentId: actionRequest.agentId,
      reviewerId: reviewer.id,
      approvalStatus: config.approvalStatus,
      actionRequestStatus: config.actionRequestStatus,
      comment,
      auditEvent: {
        type: config.auditEventType,
        metadata: {
          event: config.auditEventName,
          reviewer_email: reviewer.email,
          comment: comment ?? null,
          ...createHumanActorAuditMetadata(actor),
        },
      },
    });
  } catch {
    return failedClosedResponse("Approval persistence failed.");
  }

  if (!approvalDecision) {
    return {
      status: 409,
      body: {
        error: "not_reviewable",
        message: "Action request is no longer reviewable.",
      },
    };
  }

  return {
    status: 200,
    body: {
      action_request_id: actionRequest.id,
      approval_id: approvalDecision.approvalId,
      status: config.actionRequestStatus,
      decision: config.responseDecision,
      reason: config.reason,
    },
  };
}

function unauthorizedResponse(message: string): HandleApprovalDecisionResponse {
  return {
    status: 401,
    body: {
      error: "unauthorized",
      message,
    },
  };
}

function forbiddenResponse(message: string): HandleApprovalDecisionResponse {
  return {
    status: 403,
    body: {
      error: "forbidden",
      message,
    },
  };
}

function notFoundResponse(): HandleApprovalDecisionResponse {
  return {
    status: 404,
    body: {
      error: "not_found",
      message: "Action request was not found.",
    },
  };
}

function getReviewabilityError(
  actionRequest: StoredReviewActionRequest,
): HandleApprovalDecisionResponse | null {
  if (actionRequest.status === "APPROVED") {
    return {
      status: 409,
      body: {
        error: "already_reviewed",
        message: "Action request is already approved.",
      },
    };
  }

  if (actionRequest.status === "REJECTED") {
    return {
      status: 409,
      body: {
        error: "already_reviewed",
        message: "Action request is already rejected.",
      },
    };
  }

  if (actionRequest.decision !== "APPROVAL_REQUIRED") {
    return {
      status: 409,
      body: {
        error: "not_reviewable",
        message: "Action request does not require approval.",
      },
    };
  }

  if (actionRequest.status !== "APPROVAL_REQUIRED") {
    return {
      status: 409,
      body: {
        error: "not_reviewable",
        message: "Action request is not pending review.",
      },
    };
  }

  return null;
}

function failedClosedResponse(reason: string): HandleApprovalDecisionResponse {
  return {
    status: 500,
    body: {
      error: "failed_closed",
      message: reason,
    },
  };
}
