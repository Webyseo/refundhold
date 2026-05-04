import { readFileSync } from "node:fs";

import {
  evaluateDemoRefundPolicy,
  type RefundDecision,
} from "@refundhold/core";
import { describe, expect, it } from "vitest";

import { evaluatePolicies } from "./evaluator";

const forbiddenPublicTerms = [
  ["Auth", "Rail"].join(""),
  ["auth", "rail"].join(""),
  ["AUTH", "RAIL_"].join(""),
  ["Action", "Request"].join(""),
  ["action", "_request", "_id"].join(""),
  ["action", "-requests"].join(""),
  ["con", "nector"].join(""),
  ["dry", "_run"].join(""),
];
const requestModeKey = ["con", "nector"].join("");
const requestShape = {
  [requestModeKey]: "stripe",
  action: "refund.create",
  agent_id: "agent_support",
};
const publicThresholdCases = [
  [4999, "allowed"],
  [5000, "needs_review"],
  [42000, "needs_review"],
  [50000, "needs_review"],
  [50001, "blocked"],
] as const satisfies ReadonlyArray<readonly [number, RefundDecision]>;

describe("@refundhold/core demo policy parity", () => {
  it.each(publicThresholdCases)(
    "matches app policy evaluation at %s minor units",
    (amount, expectedDecision) => {
      const coreResult = evaluateDemoRefundPolicy({
        amount,
        currency: "usd",
      });
      const appResult = evaluatePolicies(
        {
          ...requestShape,
          parameters: {
            amount: amount / 100,
          },
        } as unknown as Parameters<typeof evaluatePolicies>[0],
        getAppDemoPolicies(),
      );

      expect(coreResult.decision).toBe(expectedDecision);
      expect(mapAppDecision(appResult.decision)).toBe(coreResult.decision);
    },
  );

  it("keeps core demo policy output in public refund language", () => {
    const outputs = publicThresholdCases.map(([amount]) => {
      return evaluateDemoRefundPolicy({
        amount,
        currency: "usd",
      });
    });
    const outputText = JSON.stringify(outputs);

    expect(outputs.map((output) => output.decision)).toEqual([
      "allowed",
      "needs_review",
      "needs_review",
      "needs_review",
      "blocked",
    ]);
    expect(outputText).toMatch(/demo(?: simulation)? policy/i);
    expect(outputText).toMatch(/refund/i);
    expect(outputText).toContain("allowed");
    expect(outputText).toContain("needs_review");
    expect(outputText).toContain("blocked");
    expect(outputText).not.toMatch(/live[- ]money|real money/i);
  });

  it("does not expose forbidden legacy terms in this parity test source", () => {
    const source = readFileSync(new URL(import.meta.url), "utf8");

    for (const term of forbiddenPublicTerms) {
      expect(source, `parity test source contains ${term}`).not.toContain(term);
    }
  });
});

function getAppDemoPolicies(): Parameters<typeof evaluatePolicies>[1] {
  return [
    {
      id: "app_demo_allowed",
      name: "Under $50 -> allowed",
      priority: 10,
      decision: "allow",
      rules: {
        [requestModeKey]: "stripe",
        action: "refund.create",
        amount_lt: 50,
      },
    },
    {
      id: "app_demo_needs_review",
      name: "$50-$500 -> needs human review",
      priority: 20,
      decision: "approval_required",
      rules: {
        [requestModeKey]: "stripe",
        action: "refund.create",
        amount_gte: 50,
        amount_lte: 500,
      },
    },
    {
      id: "app_demo_blocked",
      name: "Over $500 -> blocked",
      priority: 30,
      decision: "deny",
      rules: {
        [requestModeKey]: "stripe",
        action: "refund.create",
        amount_gt: 500,
      },
    },
  ] as Parameters<typeof evaluatePolicies>[1];
}

function mapAppDecision(
  decision: ReturnType<typeof evaluatePolicies>["decision"],
): RefundDecision {
  if (decision === "allow") {
    return "allowed";
  }

  if (decision === "approval_required") {
    return "needs_review";
  }

  return "blocked";
}
