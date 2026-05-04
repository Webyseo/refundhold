import type { RefundDecision } from "./refund-requests";

export type DemoRefundPolicy = {
  currency: string;
  allowed_below_minor: number;
  needs_review_from_minor: number;
  needs_review_through_minor: number;
  blocked_above_minor: number;
};

export type DemoRefundPolicyInput = {
  amount: number;
  currency: string;
};

export type DemoRefundPolicyResult = {
  decision: RefundDecision;
  reason: string;
  policy_rule: string;
};

export const DEFAULT_DEMO_REFUND_POLICY = {
  currency: "usd",
  allowed_below_minor: 5000,
  needs_review_from_minor: 5000,
  needs_review_through_minor: 50000,
  blocked_above_minor: 50000,
} satisfies DemoRefundPolicy;

export function evaluateDemoRefundPolicy({
  amount,
  currency,
}: DemoRefundPolicyInput): DemoRefundPolicyResult {
  const normalizedCurrency = currency.trim().toUpperCase() || "USD";

  if (amount < DEFAULT_DEMO_REFUND_POLICY.allowed_below_minor) {
    return {
      decision: "allowed",
      reason: `Under $50 -> allowed: ${normalizedCurrency} refund request is allowed by demo simulation policy.`,
      policy_rule: "Under $50 -> allowed",
    };
  }

  if (amount <= DEFAULT_DEMO_REFUND_POLICY.needs_review_through_minor) {
    return {
      decision: "needs_review",
      reason: `$50-$500 -> needs human review: ${normalizedCurrency} refund request needs approval before demo execution.`,
      policy_rule: "$50-$500 -> needs human review",
    };
  }

  return {
    decision: "blocked",
    reason: `Over $500 -> blocked: ${normalizedCurrency} refund request is blocked by demo simulation policy.`,
    policy_rule: "Over $500 -> blocked",
  };
}
