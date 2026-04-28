import { describe, expect, it, vi } from "vitest";

import {
  handleDryRunExecution,
  type DryRunExecutionPersistence,
  type PersistedDryRunExecutionInput,
  type StripeRefundExecutor,
  type StoredExecutableActionRequest,
} from "./handler";
import type { HumanActionActor } from "../auth/action-actor";

describe("handleDryRunExecution", () => {
  it("executes an approved request in dry-run mode", async () => {
    const persistence = createPersistence();

    const response = await handleDryRunExecution({
      actionRequestId: "ar_approved",
      body: {
        metadata: {
          source: "unit_test",
        },
      },
      persistence,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      action_request_id: "ar_approved",
      execution_id: "execution_123",
      status: "SUCCEEDED",
      execution_mode: "dry_run",
      message: "Dry-run execution completed.",
    });
    expect(getPersistedInput(persistence)).toEqual(
      expect.objectContaining({
        actionRequestId: "ar_approved",
        organizationId: "org_123",
        agentId: "agent_123",
        connectorId: "connector_123",
        metadata: {
          source: "unit_test",
        },
      }),
    );
  });

  it("does not execute a rejected request", async () => {
    const persistence = createPersistence({
      actionRequest: {
        ...defaultActionRequest,
        decision: "APPROVAL_REQUIRED",
        status: "REJECTED",
      },
    });

    const response = await handleDryRunExecution({
      actionRequestId: "ar_rejected",
      body: {},
      persistence,
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "not_executable",
      message: "Rejected action requests cannot be executed.",
    });
    expect(persistence.createDryRunExecution).not.toHaveBeenCalled();
  });

  it("does not execute a denied request", async () => {
    const persistence = createPersistence({
      actionRequest: {
        ...defaultActionRequest,
        decision: "DENY",
        status: "DENIED",
      },
    });

    const response = await handleDryRunExecution({
      actionRequestId: "ar_denied",
      body: {},
      persistence,
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "not_executable",
      message: "Denied action requests cannot be executed.",
    });
    expect(persistence.createDryRunExecution).not.toHaveBeenCalled();
  });

  it("does not execute a pending approval_required request", async () => {
    const persistence = createPersistence({
      actionRequest: {
        ...defaultActionRequest,
        decision: "APPROVAL_REQUIRED",
        status: "APPROVAL_REQUIRED",
      },
    });

    const response = await handleDryRunExecution({
      actionRequestId: "ar_pending",
      body: {},
      persistence,
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "not_executable",
      message: "Action request must be approved before execution.",
    });
    expect(persistence.createDryRunExecution).not.toHaveBeenCalled();
  });

  it("does not execute an already executed request again", async () => {
    const persistence = createPersistence({
      actionRequest: {
        ...defaultActionRequest,
        status: "EXECUTED",
      },
    });

    const response = await handleDryRunExecution({
      actionRequestId: "ar_executed",
      body: {},
      persistence,
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "already_executed",
      message: "Action request has already been executed.",
    });
    expect(persistence.createDryRunExecution).not.toHaveBeenCalled();
  });

  it("creates explicit execution audit events", async () => {
    const persistence = createPersistence();

    await handleDryRunExecution({
      actionRequestId: "ar_approved",
      body: {},
      persistence,
    });

    expect(getPersistedInput(persistence).auditEvents).toEqual([
      expect.objectContaining({
        type: "EXECUTION_STARTED",
      }),
      expect.objectContaining({
        type: "EXECUTION_SUCCEEDED",
      }),
    ]);
  });

  it("creates an Execution record", async () => {
    const persistence = createPersistence();

    await handleDryRunExecution({
      actionRequestId: "ar_approved",
      body: {},
      persistence,
    });

    expect(persistence.createDryRunExecution).toHaveBeenCalledOnce();
    expect(getPersistedInput(persistence)).toEqual(
      expect.objectContaining({
        mode: "DRY_RUN",
        status: "SUCCEEDED",
      }),
    );
  });

  it("keeps dry-run execution when a Stripe executor is present but the request is not reflected", async () => {
    const persistence = createPersistence();
    const stripeRefundExecutor = vi.fn<StripeRefundExecutor>();

    const response = await handleDryRunExecution({
      actionRequestId: "ar_approved",
      body: {},
      persistence,
      stripeRefundExecutor,
    });

    expect(response.status).toBe(200);
    expect(stripeRefundExecutor).not.toHaveBeenCalled();
    expect(persistence.createDryRunExecution).toHaveBeenCalledOnce();
  });

  it("delegates reflected Stripe test refunds to the Stripe executor", async () => {
    const persistence = createPersistence({
      actionRequest: {
        ...defaultActionRequest,
        connectorType: "stripe_test",
        operation: "refund.create",
        resource: {
          type: "stripe.payment_intent",
          payment_intent_id: "pi_test",
          livemode: false,
        },
        parameters: {
          payment_intent_id: "pi_test",
          amount_minor: 1000,
        },
      },
    });
    const stripeRefundExecutor = vi.fn<StripeRefundExecutor>(async () => {
      return {
        status: 200,
        body: {
          action_request_id: "ar_approved",
          execution_id: "execution_stripe",
          status: "SUCCEEDED",
          execution_mode: "stripe_test_refund",
          message: "Stripe test-mode refund completed.",
        },
      };
    });

    const response = await handleDryRunExecution({
      actionRequestId: "ar_approved",
      body: {},
      persistence,
      stripeRefundExecutor,
    });

    expect(response.status).toBe(200);
    expect(response.body.execution_mode).toBe("stripe_test_refund");
    expect(stripeRefundExecutor).toHaveBeenCalledWith({
      actionRequestId: "ar_approved",
      actor: undefined,
    });
    expect(persistence.createDryRunExecution).not.toHaveBeenCalled();
  });

  it("executes dry-run requests with an explicit session actor", async () => {
    const persistence = createPersistence();

    const response = await handleDryRunExecution({
      actionRequestId: "ar_approved",
      body: {},
      actor: createActor({
        source: "session",
        role: "REVIEWER",
      }),
      persistence,
    });

    expect(response.status).toBe(200);
    expect(getPersistedInput(persistence).auditEvents).toEqual([
      expect.objectContaining({
        metadata: expect.objectContaining({
          actor_source: "session",
          actor_email: "reviewer@example.com",
          actor_role: "REVIEWER",
          domain_user_id: "user_123",
        }),
      }),
      expect.objectContaining({
        metadata: expect.objectContaining({
          actor_source: "session",
          actor_email: "reviewer@example.com",
          actor_role: "REVIEWER",
          domain_user_id: "user_123",
        }),
      }),
    ]);
  });

  it("blocks viewer actors from execution", async () => {
    const persistence = createPersistence();

    const response = await handleDryRunExecution({
      actionRequestId: "ar_approved",
      body: {},
      actor: createActor({
        role: "VIEWER",
      }),
      persistence,
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "forbidden",
      message: "You do not have permission to perform this action.",
    });
    expect(persistence.findActionRequestForExecution).not.toHaveBeenCalled();
    expect(persistence.createDryRunExecution).not.toHaveBeenCalled();
  });

  it("does not reveal cross-organization action requests to executing actors", async () => {
    const persistence = createPersistence();

    const response = await handleDryRunExecution({
      actionRequestId: "ar_approved",
      body: {},
      actor: createActor({
        organizationId: "org_other",
      }),
      persistence,
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "not_found",
      message: "Action request was not found.",
    });
    expect(persistence.createDryRunExecution).not.toHaveBeenCalled();
  });

  it("passes the human actor to Stripe test refund execution", async () => {
    const persistence = createPersistence({
      actionRequest: {
        ...defaultActionRequest,
        connectorType: "stripe_test",
        operation: "refund.create",
        resource: {
          type: "stripe.charge",
          charge_id: "ch_test",
          livemode: false,
        },
        parameters: {
          charge_id: "ch_test",
          amount_minor: 1000,
        },
      },
    });
    const actor = createActor();
    const stripeRefundExecutor = vi.fn<StripeRefundExecutor>(async () => {
      return {
        status: 200,
        body: {
          action_request_id: "ar_approved",
          execution_id: "execution_stripe",
          status: "SUCCEEDED",
          execution_mode: "stripe_test_refund",
          message: "Stripe test-mode refund completed.",
        },
      };
    });

    await handleDryRunExecution({
      actionRequestId: "ar_approved",
      body: {},
      actor,
      persistence,
      stripeRefundExecutor,
    });

    expect(stripeRefundExecutor).toHaveBeenCalledWith({
      actionRequestId: "ar_approved",
      actor,
    });
  });
});

const defaultActionRequest: StoredExecutableActionRequest = {
  id: "ar_approved",
  organizationId: "org_123",
  agentId: "agent_123",
  connectorId: "connector_123",
  decision: "APPROVAL_REQUIRED",
  status: "APPROVED",
};

function createPersistence({
  actionRequest = defaultActionRequest,
}: {
  actionRequest?: StoredExecutableActionRequest | null;
} = {}): DryRunExecutionPersistence {
  return {
    findActionRequestForExecution: vi.fn(async () => actionRequest),
    createDryRunExecution: vi.fn(async () => {
      return {
        executionId: "execution_123",
      };
    }),
  };
}

function getPersistedInput(
  persistence: DryRunExecutionPersistence,
): PersistedDryRunExecutionInput {
  const call = vi.mocked(persistence.createDryRunExecution).mock.calls[0];

  if (!call) {
    throw new Error("Expected createDryRunExecution to be called.");
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
