import { describe, expect, it } from "vitest";

import {
  DEFAULT_DEMO_REFUND_POLICY,
  evaluateDemoRefundPolicy,
} from "./demo-policy";

describe("evaluateDemoRefundPolicy", () => {
  it.each([
    [4999, "allowed", "Under $50 -> allowed"],
    [5000, "needs_review", "$50-$500 -> needs human review"],
    [42000, "needs_review", "$50-$500 -> needs human review"],
    [50000, "needs_review", "$50-$500 -> needs human review"],
    [50001, "blocked", "Over $500 -> blocked"],
  ] as const)(
    "returns %s minor units as %s",
    (amount, expectedDecision, expectedRule) => {
      const result = evaluateDemoRefundPolicy({
        amount,
        currency: "usd",
      });

      expect(result).toEqual({
        decision: expectedDecision,
        reason: expect.stringContaining(expectedRule),
        policy_rule: expectedRule,
      });
      expect(JSON.stringify(result)).not.toMatch(
        /live[- ]money|real money|production readiness/i,
      );
    },
  );

  it("exports a public default demo policy description", () => {
    expect(DEFAULT_DEMO_REFUND_POLICY).toEqual({
      currency: "usd",
      allowed_below_minor: 5000,
      needs_review_from_minor: 5000,
      needs_review_through_minor: 50000,
      blocked_above_minor: 50000,
    });
  });
});
