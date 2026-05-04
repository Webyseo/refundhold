import { describe, expect, it } from "vitest";

import {
  filterActionRequestsByDashboardStatus,
  formatRefundRequestAmount,
  getActionRequestControls,
  getAmountCurrency,
  getDemoReviewerDisplayName,
  getImpactSummary,
  getNextSafeAction,
  getQueueIndicators,
  getRefundReviewDisplay,
  getRequestFilterCounts,
  getStripeTestRefundViewModel,
  sortDashboardActionRequestsForReview,
  type DashboardActionRequestState,
  type DashboardActionRequestSummary,
} from "./view-model";

describe("dashboard view model", () => {
  it("extracts amount and currency from request parameters", () => {
    expect(
      getAmountCurrency({
        amount: 100,
        currency: "USD",
      }),
    ).toEqual({
      amount: "100",
      currency: "USD",
    });
  });

  it("ignores malformed amount and currency parameters", () => {
    expect(
      getAmountCurrency({
        amount: "100",
        currency: 123,
      }),
    ).toEqual({
      amount: null,
      currency: null,
    });
  });

  it("shows approve and reject only for pending approval requests", () => {
    expect(
      getActionRequestControls({
        decision: "APPROVAL_REQUIRED",
        status: "APPROVAL_REQUIRED",
      }),
    ).toEqual({
      canApprove: true,
      canReject: true,
      canExecute: false,
    });
  });

  it("shows execute only for approved requests", () => {
    expect(
      getActionRequestControls({
        decision: "APPROVAL_REQUIRED",
        status: "APPROVED",
      }),
    ).toEqual({
      canApprove: false,
      canReject: false,
      canExecute: true,
    });
  });

  it("does not show actions for terminal requests", () => {
    const terminalStates = [
      {
        decision: "DENY",
        status: "DENIED",
      },
      {
        decision: "APPROVAL_REQUIRED",
        status: "REJECTED",
      },
      {
        decision: "APPROVAL_REQUIRED",
        status: "EXECUTED",
      },
    ] satisfies DashboardActionRequestState[];

    for (const state of terminalStates) {
      expect(getActionRequestControls(state)).toEqual({
        canApprove: false,
        canReject: false,
        canExecute: false,
      });
    }
  });

  it("builds a concise impact summary from amount and currency", () => {
    expect(
      getImpactSummary({
        operation: "refund.create",
        parameters: {
          amount: 100,
          currency: "usd",
        },
      }),
    ).toBe("100 USD Stripe refund");
  });

  it("formats refund request amounts as human money", () => {
    expect(
      formatRefundRequestAmount({
        amount: 420,
        currency: "usd",
      }),
    ).toBe("$420.00 USD");

    expect(
      formatRefundRequestAmount({
        amount_minor: 10000,
        currency: "usd",
      }),
    ).toBe("$100.00 USD");
  });

  it("falls back to the operation when no amount is available", () => {
    expect(
      getImpactSummary({
        operation: "refund.create",
        parameters: {},
      }),
    ).toBe("Stripe refund");
  });

  it("counts dashboard filters from request status", () => {
    const requests = [
      makeRequest("pending", "APPROVAL_REQUIRED"),
      makeRequest("approved", "APPROVED"),
      makeRequest("rejected", "REJECTED"),
      makeRequest("executed", "EXECUTED"),
      makeRequest("failed", "FAILED"),
    ];

    expect(getRequestFilterCounts(requests)).toEqual({
      all: 5,
      pending: 1,
      approved: 1,
      rejected: 1,
      executed: 1,
      failed: 1,
    });
  });

  it("filters action requests by dashboard status", () => {
    const requests = [
      makeRequest("pending", "APPROVAL_REQUIRED"),
      makeRequest("approved", "APPROVED"),
      makeRequest("denied", "DENIED"),
      makeRequest("failed", "FAILED"),
    ];

    expect(
      filterActionRequestsByDashboardStatus(requests, "pending").map(
        (request) => request.id,
      ),
    ).toEqual(["pending"]);

    expect(
      filterActionRequestsByDashboardStatus(requests, "all").map(
        (request) => request.id,
      ),
    ).toEqual(["pending", "approved", "denied", "failed"]);

    expect(
      filterActionRequestsByDashboardStatus(requests, "failed").map(
        (request) => request.id,
      ),
    ).toEqual(["failed"]);
  });

  it("sorts pending review requests before terminal requests and keeps newest first", () => {
    const requests = [
      makeRequest("old-pending", "APPROVAL_REQUIRED", new Date("2026-01-01")),
      makeRequest("new-executed", "EXECUTED", new Date("2026-01-04")),
      makeRequest("new-pending", "APPROVAL_REQUIRED", new Date("2026-01-03")),
      makeRequest("old-executed", "EXECUTED", new Date("2026-01-02")),
    ];

    expect(
      sortDashboardActionRequestsForReview(requests).map((request) => request.id),
    ).toEqual(["new-pending", "old-pending", "new-executed", "old-executed"]);
  });

  it("uses a clean demo reviewer display name instead of internal emails", () => {
    expect(
      getDemoReviewerDisplayName({
        displayName: "RefundHold Demo Reviewer",
        email: "legacy.reviewer@example.internal",
      }),
    ).toBe("RefundHold Demo Reviewer");

    expect(
      getDemoReviewerDisplayName({
        displayName: null,
        email: "legacy.reviewer@example.internal",
      }),
    ).toBe("Demo Reviewer");
  });

  it("explains the next safe action for demo refund states", () => {
    expect(
      getNextSafeAction({
        decision: "APPROVAL_REQUIRED",
        status: "APPROVAL_REQUIRED",
      }),
    ).toBe("Review evidence, then approve or reject before any demo execution.");

    expect(
      getNextSafeAction({
        decision: "APPROVAL_REQUIRED",
        status: "APPROVED",
      }),
    ).toBe("Record the demo execution simulation; no Stripe API call is made.");

    expect(
      getNextSafeAction({
        decision: "DENY",
        status: "DENIED",
      }),
    ).toBe("No execution is available because policy blocked the refund.");
  });

  it("keeps non-Stripe detail view models free of Stripe state", () => {
    expect(
      getStripeTestRefundViewModel({
        ...makeRequest("dry-run", "APPROVAL_REQUIRED"),
        connector: {
          id: "conn_demo",
          name: "Stripe Demo",
          type: "stripe_test",
        },
        resource: {
          refund_id: "re_demo",
        },
      }),
    ).toBeNull();
  });

  it("builds a safe Stripe test payment object view model", () => {
    const model = getStripeTestRefundViewModel(
      makeStripeRequest({
        stripePaymentObject: {
          id: "spo_123",
          organizationId: "org_123",
          connectorId: "conn_123",
          mode: "TEST",
          paymentIntentId: "pi_test_123",
          chargeId: "ch_test_123",
          amountMinor: 5000,
          amountRefundedMinor: 1250,
          currency: "usd",
          status: "succeeded",
          livemode: false,
          safeSnapshot: {
            paymentIntentId: "pi_test_123",
            raw_payload: {
              api_key: "sensitive_test_key_should_not_render",
            },
            stripe_signature: "Stripe-Signature should not render",
          },
        },
      }),
    );

    expect(model?.paymentObject).toEqual({
      paymentIntentId: "pi_test_123",
      chargeId: "ch_test_123",
      amount: "$50.00 USD",
      refundedSoFar: "$12.50 USD",
      refundableAmount: "$37.50 USD",
      proposedRefundAmount: "$12.50 USD",
      currency: "USD",
      status: "succeeded",
      mode: "TEST",
      livemode: "false",
    });
    expect(model?.safetyBadges).toEqual([
      "Test mode only",
      "No live money movement",
      "Live refunds disabled",
    ]);
    expect(JSON.stringify(model)).not.toContain(
      "sensitive_test_key_should_not_render",
    );
    expect(JSON.stringify(model)).not.toContain("Stripe-Signature");
  });

  it("builds safe Stripe refund and webhook reconciliation view models", () => {
    const model = getStripeTestRefundViewModel(
      makeStripeRequest({
        status: "EXECUTED",
        stripeRefund: {
          id: "sr_123",
          mode: "TEST",
          stripeRefundId: "re_test_123",
          paymentIntentId: "pi_test_123",
          chargeId: "ch_test_123",
          amountMinor: 1250,
          currency: "usd",
          reason: "requested_by_customer",
          stripeStatus: "succeeded",
          safeResponse: {
            status: "succeeded",
            full_payload: {
              secret: "sensitive_restricted_key_should_not_render",
            },
          },
          createdAt: new Date("2026-01-02T10:00:00.000Z"),
          updatedAt: new Date("2026-01-02T10:02:00.000Z"),
          execution: {
            id: "exe_123",
            status: "SUCCEEDED",
            startedAt: new Date("2026-01-02T10:00:00.000Z"),
            completedAt: new Date("2026-01-02T10:01:00.000Z"),
            createdAt: new Date("2026-01-02T10:00:00.000Z"),
          },
        },
        latestStripeWebhookEvent: {
          id: "swe_123",
          type: "refund.updated",
          status: "PROCESSED",
          errorMessage: null,
          receivedAt: new Date("2026-01-02T10:03:00.000Z"),
          processedAt: new Date("2026-01-02T10:03:01.000Z"),
          safePayload: {
            status: "succeeded",
            stripe_signature: "sig_should_not_render",
            webhook_secret: "webhook_secret_should_not_render",
          },
        },
      }),
    );

    expect(model?.refund).toMatchObject({
      refundId: "re_test_123",
      executionStatus: "SUCCEEDED",
      stripeStatus: "succeeded",
      amount: "$12.50 USD",
      currency: "USD",
      idempotency: "Protected by idempotency hash",
    });
    expect(model?.webhook).toMatchObject({
      type: "refund.updated",
      processingStatus: "PROCESSED",
      stripeStatusAfterReconciliation: "succeeded",
      message: null,
    });
    expect(JSON.stringify(model)).not.toContain(
      "sensitive_restricted_key_should_not_render",
    );
    expect(JSON.stringify(model)).not.toContain(
      "webhook_secret_should_not_render",
    );
    expect(JSON.stringify(model)).not.toContain("sig_should_not_render");
  });

  it("returns discrete queue indicators for Stripe and dry-run requests", () => {
    expect(getQueueIndicators(makeStripeRequest())).toEqual([
      "Stripe test-mode",
      "Needs review",
    ]);

    expect(
      getQueueIndicators(
        makeStripeRequest({
          status: "EXECUTED",
          stripeRefund: {
            id: "sr_123",
            stripeRefundId: "re_test_123",
            stripeStatus: "succeeded",
          },
          auditEvents: [
            {
              id: "audit_123",
              type: "STRIPE_WEBHOOK_PROCESSED",
              createdAt: new Date("2026-01-02T10:03:00.000Z"),
            },
          ],
        }),
      ),
    ).toEqual(["Stripe test-mode", "Executed", "Webhook reconciled"]);

    expect(getQueueIndicators(makeRequest("dry-run", "APPROVED"))).toEqual([
      "Demo simulation",
    ]);
  });

  it("does not expose internal product or local host copy in Stripe UI state", () => {
    const model = getStripeTestRefundViewModel(makeStripeRequest());

    expect(JSON.stringify(model)).not.toContain("AuthRail");
    expect(JSON.stringify(model)).not.toContain("authrail.local");
  });

  it("builds reviewer-facing evidence for a Stripe test-mode refund", () => {
    const review = getRefundReviewDisplay({
      ...makeStripeRequest({
        parameters: {
          amount_minor: 10000,
          currency: "usd",
          payment_intent_id: "pi_test_123",
          charge_id: "ch_test_123",
          reason: "requested_by_customer",
        },
        stripePaymentObject: {
          id: "spo_123",
          organizationId: "org_123",
          connectorId: "conn_123",
          mode: "TEST",
          paymentIntentId: "pi_test_123",
          chargeId: "ch_test_123",
          amountMinor: 50000,
          amountRefundedMinor: 0,
          currency: "usd",
          status: "succeeded",
          livemode: false,
          safeSnapshot: {},
        },
      }),
      requestPayload: null,
      decisionReason: "approval_required policy matched: Medium refund manual review",
      context: {
        risk_reason: "Possible duplicate billing on the same invoice.",
        order: {
          id: "RH-DEMO-2042",
          summary: "Duplicate subscription renewal",
        },
        customer: {
          name: "Demo Customer",
          email: "customer-042@example.test",
        },
      },
      agent: {
        id: "agent_123",
        name: "RefundHold Demo AI Support Agent",
      },
      approvals: [],
      executions: [],
      latestStripeWebhookEvent: null,
      auditEvents: [
        {
          id: "audit_1",
          actorType: "AGENT",
          type: "REQUEST_RECEIVED",
          metadata: {
            reason: "Customer says they were charged twice.",
          },
          createdAt: new Date("2026-01-02T09:00:00.000Z"),
          agent: {
            id: "agent_123",
            name: "RefundHold Demo AI Support Agent",
          },
          user: null,
        },
        {
          id: "audit_2",
          actorType: "SYSTEM",
          type: "POLICY_EVALUATED",
          metadata: {
            reason: "Human approval required for refunds between $50 and $500",
          },
          createdAt: new Date("2026-01-02T09:01:00.000Z"),
          agent: null,
          user: null,
        },
      ],
    });

    expect(review.aiJustification).toBe(
      "Possible duplicate billing on the same invoice.",
    );
    expect(review.customerContext).toEqual([
      { label: "Customer", value: "Demo Customer (customer-042@example.test)" },
      { label: "Order summary", value: "RH-DEMO-2042 - Duplicate subscription renewal" },
      {
        label: "Refund reason",
        value:
          "Customer requested a refund; reviewer should confirm the support evidence before approving.",
      },
      { label: "Requested by", value: "RefundHold Demo AI Support Agent" },
      { label: "Requested amount", value: "$100.00 USD" },
    ]);
    expect(review.modeLabel).toBe("Stripe test-mode");
    expect(review.statusItems).toEqual([
      { label: "Current status", value: "Waiting for human approval" },
      { label: "Policy result", value: "Human approval required" },
      { label: "Reviewer decision", value: "Waiting for review" },
      { label: "Execution outcome", value: "Waiting for review" },
    ]);
    expect(review.evidence).toEqual(
      expect.arrayContaining([
        { label: "Request ID", value: "ar_stripe" },
        { label: "Actor", value: "RefundHold Demo AI Support Agent" },
        { label: "Stripe mode", value: "Stripe test-mode" },
        { label: "Live mode", value: "No" },
        {
          label: "Matched rule",
          value: "Human approval required: policy matched: Medium refund manual review",
        },
        { label: "Idempotency", value: "Not recorded in demo data" },
        { label: "Webhook status", value: "Not recorded" },
      ]),
    );
    expect(review.auditTrail[0]).toMatchObject({
      actor: "RefundHold Demo AI Support Agent",
      label: "Request received from AI support agent",
    });
    expect(JSON.stringify(review)).not.toContain("amount_minor");
    expect(JSON.stringify(review)).not.toContain("APPROVAL_REQUIRED");
    expect(JSON.stringify(review)).not.toContain("approval_required");
  });

  it("uses a safe AI justification fallback when structured evidence is missing", () => {
    const review = getRefundReviewDisplay({
      ...makeRequest("fallback", "APPROVAL_REQUIRED"),
      context: {},
      requestPayload: null,
      decisionReason: null,
      agent: {
        id: "agent_123",
        name: "Support Agent",
      },
      approvals: [],
      executions: [],
      stripePaymentObject: null,
      stripeRefund: null,
      latestStripeWebhookEvent: null,
      auditEvents: [],
    });

    expect(review.aiJustification).toBe(
      "The AI support agent recommended this refund and RefundHold evaluated it against your refund policy.",
    );
    expect(review.amount).toBe("$100.00 USD");
    expect(review.modeLabel).toBe("Demo simulation");
  });
});

function makeRequest(
  id: string,
  status: DashboardActionRequestSummary["status"],
  createdAt = new Date("2026-01-01"),
): DashboardActionRequestSummary {
  return {
    id,
    status,
    decision: status === "DENIED" ? "DENY" : "APPROVAL_REQUIRED",
    createdAt,
    operation: "refund.create",
    parameters: {
      amount: 100,
      currency: "USD",
    },
  };
}

function makeStripeRequest(
  overrides: Partial<Parameters<typeof getStripeTestRefundViewModel>[0]> = {},
): Parameters<typeof getStripeTestRefundViewModel>[0] {
  return {
    id: "ar_stripe",
    status: "APPROVAL_REQUIRED",
    decision: "APPROVAL_REQUIRED",
    createdAt: new Date("2026-01-01"),
    operation: "refund.create",
    connector: {
      id: "conn_123",
      name: "Stripe Test",
      type: "stripe_test",
    },
    resource: {
      type: "stripe.payment_intent",
      payment_intent_id: "pi_test_123",
      charge_id: "ch_test_123",
      livemode: false,
    },
    parameters: {
      amount_minor: 1250,
      currency: "usd",
      payment_intent_id: "pi_test_123",
      charge_id: "ch_test_123",
      refundable_amount_minor: 3750,
      reason: "requested_by_customer",
    },
    ...overrides,
  };
}
