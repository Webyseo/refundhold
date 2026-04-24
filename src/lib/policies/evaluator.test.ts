import { describe, expect, it } from "vitest";

import { evaluatePolicies, type Policy } from "./evaluator";

const baseRequest = {
  connector: "stripe",
  action: "refund.create",
  agent_id: "agent_support",
  parameters: {
    amount: 75,
  },
};

describe("evaluatePolicies", () => {
  it("returns allow when an allow policy matches", () => {
    const policies: Policy[] = [
      {
        id: "policy_allow_refunds",
        name: "Allow small refunds",
        priority: 100,
        decision: "allow",
        rules: {
          connector: "stripe",
          action: "refund.create",
          agent_id: "agent_support",
          amount_lte: 100,
        },
      },
    ];

    expect(evaluatePolicies(baseRequest, policies)).toEqual({
      decision: "allow",
      reason: "allow policy matched: Allow small refunds",
      matchedPolicies: [
        {
          id: "policy_allow_refunds",
          name: "Allow small refunds",
          priority: 100,
          decision: "allow",
        },
      ],
      winningPolicy: {
        id: "policy_allow_refunds",
        name: "Allow small refunds",
        priority: 100,
        decision: "allow",
      },
    });
  });

  it("returns deny when a deny policy matches", () => {
    const policies: Policy[] = [
      {
        id: "policy_deny_delete",
        name: "Deny customer deletion",
        priority: 10,
        decision: "deny",
        rules: {
          connector: "stripe",
          action: "customer.delete",
        },
      },
    ];

    const result = evaluatePolicies(
      {
        ...baseRequest,
        action: "customer.delete",
      },
      policies,
    );

    expect(result.decision).toBe("deny");
    expect(result.reason).toBe("deny policy matched: Deny customer deletion");
    expect(result.winningPolicy?.id).toBe("policy_deny_delete");
  });

  it("returns approval_required when an approval policy matches", () => {
    const policies: Policy[] = [
      {
        id: "policy_approve_large_refunds",
        name: "Review large refunds",
        priority: 20,
        decision: "approval_required",
        rules: {
          connector: "stripe",
          action: "refund.create",
          amount_gte: 500,
        },
      },
    ];

    const result = evaluatePolicies(
      {
        ...baseRequest,
        parameters: {
          amount: 500,
        },
      },
      policies,
    );

    expect(result.decision).toBe("approval_required");
    expect(result.reason).toBe(
      "approval_required policy matched: Review large refunds",
    );
    expect(result.winningPolicy?.id).toBe("policy_approve_large_refunds");
  });

  it("defaults to deny when no policy matches", () => {
    const result = evaluatePolicies(baseRequest, [
      {
        id: "policy_other_connector",
        name: "Allow GitHub issue edits",
        priority: 100,
        decision: "allow",
        rules: {
          connector: "github",
          action: "issue.update",
        },
      },
    ]);

    expect(result).toEqual({
      decision: "deny",
      reason: "no matching policy; default deny",
      matchedPolicies: [],
    });
  });

  it("supports numeric amount thresholds", () => {
    const policies: Policy[] = [
      {
        id: "policy_approve_middle_band",
        name: "Review middle-band transfers",
        priority: 10,
        decision: "approval_required",
        rules: {
          connector: "stripe",
          action: "transfer.create",
          amount_gt: 100,
          amount_lt: 1000,
        },
      },
    ];

    const result = evaluatePolicies(
      {
        connector: "stripe",
        action: "transfer.create",
        agent_id: "agent_finance",
        parameters: {
          amount: 250,
        },
      },
      policies,
    );

    expect(result.decision).toBe("approval_required");
    expect(result.winningPolicy?.id).toBe("policy_approve_middle_band");
  });

  it("uses priority to choose between policies with the same decision", () => {
    const policies: Policy[] = [
      {
        id: "policy_low_priority_allow",
        name: "Generic refund allow",
        priority: 100,
        decision: "allow",
        rules: {
          connector: "stripe",
          action: "refund.create",
        },
      },
      {
        id: "policy_high_priority_allow",
        name: "Support refund allow",
        priority: 10,
        decision: "allow",
        rules: {
          connector: "stripe",
          action: "refund.create",
          agent_id: "agent_support",
        },
      },
    ];

    const result = evaluatePolicies(baseRequest, policies);

    expect(result.decision).toBe("allow");
    expect(result.winningPolicy?.id).toBe("policy_high_priority_allow");
    expect(result.reason).toBe("allow policy matched: Support refund allow");
  });

  it("lets deny win when conflicting policies match", () => {
    const policies: Policy[] = [
      {
        id: "policy_approve_transfers",
        name: "Review transfers",
        priority: 1,
        decision: "approval_required",
        rules: {
          connector: "stripe",
          action: "transfer.create",
        },
      },
      {
        id: "policy_deny_high_transfers",
        name: "Deny high transfers",
        priority: 100,
        decision: "deny",
        rules: {
          connector: "stripe",
          action: "transfer.create",
          amount_gte: 10000,
        },
      },
    ];

    const result = evaluatePolicies(
      {
        connector: "stripe",
        action: "transfer.create",
        agent_id: "agent_finance",
        parameters: {
          amount: 10000,
        },
      },
      policies,
    );

    expect(result.decision).toBe("deny");
    expect(result.winningPolicy?.id).toBe("policy_deny_high_transfers");
    expect(result.matchedPolicies.map((policy) => policy.id)).toEqual([
      "policy_approve_transfers",
      "policy_deny_high_transfers",
    ]);
  });
});
