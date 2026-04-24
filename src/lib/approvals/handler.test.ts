import { describe, expect, it, vi } from "vitest";

import {
  handleApprovalDecision,
  type ApprovalDecisionPersistence,
  type PersistedApprovalDecisionInput,
  type StoredReviewActionRequest,
  type StoredReviewer,
} from "./handler";

describe("handleApprovalDecision", () => {
  it("rejects a missing reviewer header", async () => {
    const persistence = createPersistence();

    const response = await handleApprovalDecision({
      action: "approve",
      actionRequestId: "ar_review",
      body: {},
      reviewerEmailHeader: null,
      persistence,
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "unauthorized",
      message: "X-AuthRail-Reviewer-Email header is required.",
    });
    expect(persistence.findActionRequestForReview).not.toHaveBeenCalled();
  });

  it("rejects an unknown reviewer", async () => {
    const persistence = createPersistence({
      reviewer: null,
    });

    const response = await handleApprovalDecision({
      action: "approve",
      actionRequestId: "ar_review",
      body: {},
      reviewerEmailHeader: "missing@authrail.local",
      persistence,
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "forbidden",
      message: "Reviewer is not authorized for this organization.",
    });
    expect(persistence.findReviewerByOrganizationAndEmail).toHaveBeenCalledWith(
      {
        organizationId: "org_123",
        email: "missing@authrail.local",
      },
    );
    expect(persistence.createApprovalDecision).not.toHaveBeenCalled();
  });

  it("approves an approval_required request", async () => {
    const persistence = createPersistence();

    const response = await handleApprovalDecision({
      action: "approve",
      actionRequestId: "ar_review",
      body: {
        comment: "Looks safe.",
      },
      reviewerEmailHeader: "reviewer@authrail.local",
      persistence,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      action_request_id: "ar_review",
      approval_id: "approval_123",
      status: "APPROVED",
      decision: "approved",
      reason: "Action request approved.",
    });
    expect(persistence.createApprovalDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        actionRequestId: "ar_review",
        organizationId: "org_123",
        reviewerId: "user_123",
        agentId: "agent_123",
        approvalStatus: "APPROVED",
        actionRequestStatus: "APPROVED",
        comment: "Looks safe.",
      }),
    );
  });

  it("rejects an approval_required request", async () => {
    const persistence = createPersistence();

    const response = await handleApprovalDecision({
      action: "reject",
      actionRequestId: "ar_review",
      body: {
        comment: "Too risky.",
      },
      reviewerEmailHeader: "reviewer@authrail.local",
      persistence,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      action_request_id: "ar_review",
      approval_id: "approval_123",
      status: "REJECTED",
      decision: "rejected",
      reason: "Action request rejected.",
    });
    expect(getPersistedInput(persistence)).toEqual(
      expect.objectContaining({
        approvalStatus: "REJECTED",
        actionRequestStatus: "REJECTED",
        comment: "Too risky.",
        auditEvent: expect.objectContaining({
          type: "APPROVAL_REJECTED",
        }),
      }),
    );
  });

  it("does not approve a denied request", async () => {
    const persistence = createPersistence({
      actionRequest: {
        ...defaultActionRequest,
        decision: "DENY",
        status: "DENIED",
      },
    });

    const response = await handleApprovalDecision({
      action: "approve",
      actionRequestId: "ar_review",
      body: {},
      reviewerEmailHeader: "reviewer@authrail.local",
      persistence,
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "not_reviewable",
      message: "Action request does not require approval.",
    });
    expect(persistence.createApprovalDecision).not.toHaveBeenCalled();
  });

  it("does not approve an already approved request again", async () => {
    const persistence = createPersistence({
      actionRequest: {
        ...defaultActionRequest,
        status: "APPROVED",
      },
    });

    const response = await handleApprovalDecision({
      action: "approve",
      actionRequestId: "ar_review",
      body: {},
      reviewerEmailHeader: "reviewer@authrail.local",
      persistence,
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "already_reviewed",
      message: "Action request is already approved.",
    });
    expect(persistence.createApprovalDecision).not.toHaveBeenCalled();
  });

  it("does not reject an already rejected request again", async () => {
    const persistence = createPersistence({
      actionRequest: {
        ...defaultActionRequest,
        status: "REJECTED",
      },
    });

    const response = await handleApprovalDecision({
      action: "reject",
      actionRequestId: "ar_review",
      body: {},
      reviewerEmailHeader: "reviewer@authrail.local",
      persistence,
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "already_reviewed",
      message: "Action request is already rejected.",
    });
    expect(persistence.createApprovalDecision).not.toHaveBeenCalled();
  });

  it("persists an explicit audit event type", async () => {
    const persistence = createPersistence();

    await handleApprovalDecision({
      action: "approve",
      actionRequestId: "ar_review",
      body: {},
      reviewerEmailHeader: "reviewer@authrail.local",
      persistence,
    });

    expect(getPersistedInput(persistence).auditEvent.type).toBe(
      "APPROVAL_APPROVED",
    );
  });
});

const defaultActionRequest: StoredReviewActionRequest = {
  id: "ar_review",
  organizationId: "org_123",
  agentId: "agent_123",
  decision: "APPROVAL_REQUIRED",
  status: "APPROVAL_REQUIRED",
};

const defaultReviewer: StoredReviewer = {
  id: "user_123",
  organizationId: "org_123",
  email: "reviewer@authrail.local",
  status: "ACTIVE",
};

function createPersistence({
  actionRequest = defaultActionRequest,
  reviewer = defaultReviewer,
}: {
  actionRequest?: StoredReviewActionRequest | null;
  reviewer?: StoredReviewer | null;
} = {}): ApprovalDecisionPersistence {
  return {
    findActionRequestForReview: vi.fn(async () => actionRequest),
    findReviewerByOrganizationAndEmail: vi.fn(async () => reviewer),
    createApprovalDecision: vi.fn(async () => {
      return {
        approvalId: "approval_123",
      };
    }),
  };
}

function getPersistedInput(
  persistence: ApprovalDecisionPersistence,
): PersistedApprovalDecisionInput {
  const call = vi.mocked(persistence.createApprovalDecision).mock.calls[0];

  if (!call) {
    throw new Error("Expected createApprovalDecision to be called.");
  }

  return call[0];
}
