import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/action-actor", () => {
  return {
    resolveHumanActionActor: vi.fn(),
  };
});

vi.mock("@/lib/approvals/handler", () => {
  return {
    handleApprovalDecision: vi.fn(),
  };
});

vi.mock("@/lib/executions/handler", () => {
  return {
    handleDryRunExecution: vi.fn(),
  };
});

vi.mock("@/lib/db/prisma", () => {
  return {
    getPrismaClient: vi.fn(),
  };
});

vi.mock("@/lib/approvals/prisma-persistence", () => {
  return {
    createPrismaApprovalDecisionPersistence: vi.fn(),
  };
});

vi.mock("@/lib/executions/prisma-persistence", () => {
  return {
    createPrismaDryRunExecutionPersistence: vi.fn(),
    createPrismaStripeTestRefundExecutionPersistence: vi.fn(),
  };
});

vi.mock("@/lib/stripe/refund-execution", () => {
  return {
    executeStripeTestRefundForActionRequest: vi.fn(),
  };
});

import { handleApprovalDecision } from "@/lib/approvals/handler";
import { resolveHumanActionActor } from "@/lib/auth/action-actor";
import { handleDryRunExecution } from "@/lib/executions/handler";

import { POST as approveRefundRequest } from "./approve/route";
import { POST as executeRefundRequest } from "./execute/route";
import { POST as rejectRefundRequest } from "./reject/route";

const mockedResolveHumanActionActor = vi.mocked(resolveHumanActionActor);
const mockedHandleApprovalDecision = vi.mocked(handleApprovalDecision);
const mockedHandleDryRunExecution = vi.mocked(handleDryRunExecution);

describe("refund request decision and execution aliases", () => {
  beforeEach(() => {
    mockedResolveHumanActionActor.mockReset();
    mockedHandleApprovalDecision.mockReset();
    mockedHandleDryRunExecution.mockReset();

    mockedResolveHumanActionActor.mockResolvedValue({
      ok: true,
      actor: {
        source: "demo",
        organizationId: "org_123",
        domainUserId: "user_123",
        email: "demo.reviewer@refundhold.com",
        role: "REVIEWER",
        permissions: {
          viewDashboard: true,
          reviewActionRequests: true,
          executeRefunds: true,
          managePolicies: false,
          manageConnectors: false,
          manageMembers: false,
        },
      },
    });
  });

  it("approves a refund request through the compatibility approval handler", async () => {
    mockedHandleApprovalDecision.mockResolvedValue({
      status: 200,
      body: {
        action_request_id: "ar_review",
        approval_id: "approval_123",
        status: "APPROVED",
        decision: "approved",
        reason: "Action request approved.",
      },
    });

    const response = await approveRefundRequest(createRequest(), createContext());

    expect(mockedHandleApprovalDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "approve",
        actionRequestId: "ar_review",
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      refund_request_id: "ar_review",
      status: "approved",
      decision: "approved",
      outcome: "approved",
      review_url: "/app/refund-requests/ar_review",
      message: "Refund approved.",
    });
  });

  it("rejects a refund request through the compatibility rejection handler", async () => {
    mockedHandleApprovalDecision.mockResolvedValue({
      status: 200,
      body: {
        action_request_id: "ar_review",
        approval_id: "approval_123",
        status: "REJECTED",
        decision: "rejected",
        reason: "Action request rejected.",
      },
    });

    const response = await rejectRefundRequest(createRequest(), createContext());

    expect(mockedHandleApprovalDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "reject",
        actionRequestId: "ar_review",
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      refund_request_id: "ar_review",
      status: "rejected",
      decision: "rejected",
      outcome: "rejected",
      review_url: "/app/refund-requests/ar_review",
      message: "Refund rejected.",
    });
  });

  it("records demo execution through the compatibility execution handler", async () => {
    mockedHandleDryRunExecution.mockResolvedValue({
      status: 200,
      body: {
        action_request_id: "ar_review",
        execution_id: "execution_123",
        status: "SUCCEEDED",
        execution_mode: "dry_run",
        message: "Dry-run execution completed.",
      },
    });

    const response = await executeRefundRequest(
      createRequest({
        metadata: {
          source: "unit_test",
        },
      }),
      createContext(),
    );

    expect(mockedHandleDryRunExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        actionRequestId: "ar_review",
        body: {
          metadata: {
            source: "unit_test",
          },
        },
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      refund_request_id: "ar_review",
      status: "executed",
      outcome: "executed",
      review_url: "/app/refund-requests/ar_review",
      message: "Demo execution recorded.",
    });
  });

  it("maps compatibility execution errors into refund request language", async () => {
    mockedHandleDryRunExecution.mockResolvedValue({
      status: 409,
      body: {
        error: "not_executable",
        message: "Denied action requests cannot be executed.",
      },
    });

    const response = await executeRefundRequest(createRequest(), createContext());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "not_executable",
      refund_request_id: "ar_review",
      message: "Blocked refund requests cannot be executed.",
    });
  });
});

function createRequest(body: unknown = {}) {
  return new Request(
    "http://localhost:3000/api/v1/refund-requests/ar_review/approve",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-refundhold-reviewer-email": "demo.reviewer@refundhold.com",
      },
      body: JSON.stringify(body),
    },
  );
}

function createContext() {
  return {
    params: Promise.resolve({
      id: "ar_review",
    }),
  };
}
