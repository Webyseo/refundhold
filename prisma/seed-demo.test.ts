import { describe, expect, it } from "vitest";

import {
  curatedDemoRefundRequestIds,
  demoRefundRequests,
} from "./seed-demo";

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
});
