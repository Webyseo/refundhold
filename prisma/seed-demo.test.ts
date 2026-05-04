import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  curatedDemoRefundRequestIds,
  demoRefundRequests,
} from "./seed-demo";

const seedSource = readFileSync(new URL("./seed-demo.ts", import.meta.url), "utf8");

function collectVisibleSeedCopy() {
  const requestCopy = demoRefundRequests.flatMap((request) => [
    request.refundReason,
    request.riskReason,
    request.order.summary,
    request.customerMessage,
    request.policyReason,
    request.webhookStatus ?? "",
    request.approval?.reason ?? "",
  ]);
  const visibleSourceLines = seedSource
    .split("\n")
    .filter((line) =>
      /\b(name|description|summary|reason|message|note):/.test(line),
    );

  return [...requestCopy, ...visibleSourceLines].join("\n");
}

describe("demo seed refund requests", () => {
  it("defines a small curated set of fake refund requests", () => {
    expect(demoRefundRequests).toHaveLength(8);
    expect(curatedDemoRefundRequestIds).toHaveLength(8);
    expect(new Set(curatedDemoRefundRequestIds).size).toBe(8);
    expect(demoRefundRequests.map((request) => request.id)).toEqual(
      curatedDemoRefundRequestIds,
    );
  });

  it("uses only clearly fake customer emails", () => {
    for (const request of demoRefundRequests) {
      expect(request.customer.email).toMatch(/@example\.test$/);
      expect(request.customer.email).not.toMatch(
        /maya|sam|lena|noah|amelia|oliver/i,
      );
    }
  });

  it("covers the required reviewer states and modes without repeated clutter", () => {
    expect(demoRefundRequests.map((request) => request.status)).toEqual(
      expect.arrayContaining([
        "APPROVAL_REQUIRED",
        "APPROVED",
        "REJECTED",
        "EXECUTED",
        "DENIED",
        "FAILED",
        "ALLOWED",
      ]),
    );
    expect(demoRefundRequests.map((request) => request.mode)).toEqual(
      expect.arrayContaining(["demo_simulation", "stripe_test_mode"]),
    );
    expect(
      demoRefundRequests.filter((request) => request.amount === 100),
    ).toHaveLength(1);
  });

  it("keeps Stripe test-mode cases non-live and object-shaped", () => {
    const stripeTestRequests = demoRefundRequests.filter(
      (request) => request.mode === "stripe_test_mode",
    );

    expect(stripeTestRequests.length).toBeGreaterThanOrEqual(2);

    for (const request of stripeTestRequests) {
      expect(request.livemode).toBe(false);
      expect(request.paymentIntentId).toMatch(/^pi_demo_refundhold_/);
      expect(request.chargeId).toMatch(/^ch_demo_refundhold_/);
    }
  });

  it("uses RefundHold public wording in visible demo seed copy", () => {
    const visibleCopy = collectVisibleSeedCopy();

    expect(visibleCopy).toMatch(/Demo simulation/i);
    expect(visibleCopy).not.toMatch(/dry[_ ]run/i);
    expect(visibleCopy).not.toMatch(/live Stripe refund/i);
  });

  it("keeps the demo policy thresholds unchanged", () => {
    expect(seedSource).toMatch(
      /key: "lowRiskAllow"[\s\S]*decision: "ALLOW"[\s\S]*amount_lt: 50/,
    );
    expect(seedSource).toMatch(
      /key: "standardReview"[\s\S]*decision: "APPROVAL_REQUIRED"[\s\S]*amount_gte: 50[\s\S]*amount_lte: 250/,
    );
    expect(seedSource).toMatch(
      /key: "highRiskReview"[\s\S]*decision: "APPROVAL_REQUIRED"[\s\S]*amount_gt: 250[\s\S]*amount_lte: 500/,
    );
    expect(seedSource).toMatch(
      /key: "policyDeny"[\s\S]*decision: "DENY"[\s\S]*amount_gt: 500/,
    );
  });

  it("keeps the local demo seed safe and clearly non-live", () => {
    for (const request of demoRefundRequests) {
      expect(request.livemode).toBe(false);
      expect(request.paymentIntentId).toMatch(/^pi_demo_refundhold_/);
      expect(request.chargeId).toMatch(/^ch_demo_refundhold_/);
      expect(request.paymentIntentId).not.toMatch(/live/i);
      expect(request.chargeId).not.toMatch(/live/i);
    }

    expect(seedSource).toContain("fictional_data: true");
    expect(seedSource).toContain("stripe_called: false");
    expect(seedSource).toContain("money_moved: false");
  });
});
