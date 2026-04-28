import { describe, expect, it, vi } from "vitest";

import {
  handleApprovalDecision,
  type ApprovalDecisionPersistence,
  type PersistedApprovalDecisionInput,
  type StoredReviewActionRequest,
  type StoredReviewer,
} from "./handler";
import type { HumanActionActor } from "../auth/action-actor";

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
      message: "X-RefundHold-Reviewer-Email header is required.",
    });
    expect(persistence.findActionRequestForReview).not.toHaveBeenCalled();
  });

  it("rejects an unrecognized reviewer", async () => {
    const persistence = createPersistence({
      reviewer: null,
    });

    const response = await handleApprovalDecision({
      action: "approve",
      actionRequestId: "ar_review",
      body: {},
      reviewerEmailHeader: "missing@refundhold.com",
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
        email: "missing@refundhold.com",
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
      reviewerEmailHeader: "demo.reviewer@refundhold.com",
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
      reviewerEmailHeader: "demo.reviewer@refundhold.com",
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
      reviewerEmailHeader: "demo.reviewer@refundhold.com",
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
      reviewerEmailHeader: "demo.reviewer@refundhold.com",
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
      reviewerEmailHeader: "demo.reviewer@refundhold.com",
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
      reviewerEmailHeader: "demo.reviewer@refundhold.com",
      persistence,
    });

    expect(getPersistedInput(persistence).auditEvent.type).toBe(
      "APPROVAL_APPROVED",
    );
  });

  it("approves with an explicit session actor and records safe actor metadata", async () => {
    const persistence = createPersistence();

    const response = await handleApprovalDecision({
      action: "approve",
      actionRequestId: "ar_review",
      body: {},
      actor: createActor({
        source: "session",
        role: "REVIEWER",
      }),
      reviewerEmailHeader: null,
      persistence,
    });

    expect(response.status).toBe(200);
    expect(persistence.findReviewerByOrganizationAndEmail).not.toHaveBeenCalled();
    expect(getPersistedInput(persistence)).toEqual(
      expect.objectContaining({
        reviewerId: "user_123",
        auditEvent: expect.objectContaining({
          metadata: expect.objectContaining({
            actor_source: "session",
            actor_email: "reviewer@example.com",
            actor_role: "REVIEWER",
            domain_user_id: "user_123",
          }),
        }),
      }),
    );
  });

  it("rejects with an explicit reviewer actor", async () => {
    const persistence = createPersistence();

    const response = await handleApprovalDecision({
      action: "reject",
      actionRequestId: "ar_review",
      body: {},
      actor: createActor({
        source: "session",
        role: "ADMIN",
      }),
      reviewerEmailHeader: null,
      persistence,
    });

    expect(response.status).toBe(200);
    expect(getPersistedInput(persistence)).toEqual(
      expect.objectContaining({
        reviewerId: "user_123",
        approvalStatus: "REJECTED",
      }),
    );
  });

  it("blocks viewer actors from approving or rejecting", async () => {
    const persistence = createPersistence();

    const approve = await handleApprovalDecision({
      action: "approve",
      actionRequestId: "ar_review",
      body: {},
      actor: createActor({
        role: "VIEWER",
      }),
      reviewerEmailHeader: null,
      persistence,
    });
    const reject = await handleApprovalDecision({
      action: "reject",
      actionRequestId: "ar_review",
      body: {},
      actor: createActor({
        role: "VIEWER",
      }),
      reviewerEmailHeader: null,
      persistence,
    });

    expect(approve.status).toBe(403);
    expect(reject.status).toBe(403);
    expect(persistence.findActionRequestForReview).not.toHaveBeenCalled();
    expect(persistence.createApprovalDecision).not.toHaveBeenCalled();
  });

  it("does not reveal cross-organization action requests to session actors", async () => {
    const persistence = createPersistence();

    const response = await handleApprovalDecision({
      action: "approve",
      actionRequestId: "ar_review",
      body: {},
      actor: createActor({
        organizationId: "org_other",
      }),
      reviewerEmailHeader: null,
      persistence,
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "not_found",
      message: "Action request was not found.",
    });
    expect(persistence.createApprovalDecision).not.toHaveBeenCalled();
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
  email: "demo.reviewer@refundhold.com",
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

function createActor({
  source = "session",
  organizationId = "org_123",
  role = "REVIEWER",
}: {
  source?: HumanActionActor["source"];
  organizationId?: string;
  role?: HumanActionActor["role"];
} = {}): HumanActionActor {
  return {
    source,
    organizationId,
    domainUserId: "user_123",
    email: "reviewer@example.com",
    role,
    permissions: {
      viewDashboard: true,
      reviewActionRequests: role !== "VIEWER",
      executeRefunds: role !== "VIEWER",
      managePolicies: role === "OWNER" || role === "ADMIN",
      manageConnectors: role === "OWNER" || role === "ADMIN",
      manageMembers: role === "OWNER",
    },
  };
}
