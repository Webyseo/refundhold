import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { toRefundRequestBody } from "@/app/api/v1/refund-requests/refund-response";

import type {
  RefundRequestCreateResponse as CoreRefundRequestCreateResponse,
  RefundRequestPublicResponse as CoreRefundRequestPublicResponse,
} from "@refundhold/core";
import type {
  RefundDecision,
  RefundMode,
  RefundRequestCreateInput,
  RefundRequestCreateResponse,
  RefundRequestErrorResponse,
  RefundRequestExecutionResponse,
  RefundRequestPublicResponse,
  RefundRequestReviewResponse,
  RefundStatus,
} from "./refund-requests";

const contractSource = readFileSync(
  new URL("./refund-requests.ts", import.meta.url),
  "utf8",
);
const internalIdKey = ["action", "_request", "_id"].join("");
const legacyModeValue = ["dry", "_run"].join("");
const forbiddenPublicTerms = {
  legacyProduct: ["Auth", "Rail"].join(""),
  legacyProductLower: ["auth", "rail"].join(""),
  legacyEnv: ["AUTH", "RAIL_"].join(""),
  legacyModel: ["Action", "Request"].join(""),
  legacyId: internalIdKey,
  legacyRoute: ["action", "-requests"].join(""),
  genericIntegration: ["con", "nector"].join(""),
  legacyMode: legacyModeValue,
};

describe("public refund request contracts", () => {
  it("uses @refundhold/core as the public type source of truth", () => {
    expect(contractSource).toContain('export type {');
    expect(contractSource).toContain('} from "@refundhold/core";');
    expect(contractSource).not.toMatch(/export type RefundDecision\s*=/);
    expect(contractSource).not.toMatch(/export type RefundStatus\s*=/);
    expect(contractSource).not.toMatch(/export type RefundMode\s*=/);
    expect(contractSource).not.toMatch(
      /export type RefundRequestPublicResponse\s*=/,
    );
  });

  it("does not expose legacy names in the public contract source", () => {
    expect(contractSource).not.toContain(forbiddenPublicTerms.legacyModel);
    expect(contractSource).not.toContain(forbiddenPublicTerms.legacyId);
    expect(contractSource).not.toContain(forbiddenPublicTerms.legacyProduct);
    expect(contractSource).not.toContain(forbiddenPublicTerms.legacyEnv);
    expect(contractSource).not.toMatch(
      new RegExp(`\\b${forbiddenPublicTerms.genericIntegration}\\b`),
    );
    expect(contractSource).not.toContain(forbiddenPublicTerms.legacyMode);
  });

  it("defines public decisions, statuses, and modes", () => {
    const allowed = "allowed" satisfies RefundDecision;
    const needsReview = "needs_review" satisfies RefundDecision;
    const blocked = "blocked" satisfies RefundDecision;
    const executed = "executed" satisfies RefundStatus;
    const failed = "failed" satisfies RefundStatus;
    const demoSimulation = "demo_simulation" satisfies RefundMode;
    const stripeTestMode = "stripe_test_mode" satisfies RefundMode;

    expect([
      allowed,
      needsReview,
      blocked,
      executed,
      failed,
      demoSimulation,
      stripeTestMode,
    ]).toEqual([
      "allowed",
      "needs_review",
      "blocked",
      "executed",
      "failed",
      "demo_simulation",
      "stripe_test_mode",
    ]);
  });

  it("types the public create request and response fields", () => {
    const input = {
      stripe_mode: "demo_simulation",
      amount: 42000,
      currency: "usd",
      reason: "AI support agent recommends a refund.",
    } satisfies RefundRequestCreateInput;
    const response = {
      refund_request_id: "rr_123",
      decision: "needs_review",
      reason: "Human approval required for refunds between $50 and $500",
      review_url: "/app/refund-requests/rr_123",
    } satisfies RefundRequestCreateResponse;

    expect(input.stripe_mode).toBe("demo_simulation");
    expect(response).toEqual({
      refund_request_id: "rr_123",
      decision: "needs_review",
      reason: "Human approval required for refunds between $50 and $500",
      review_url: "/app/refund-requests/rr_123",
    });
  });

  it("keeps app public contract types assignable to core contract types", () => {
    const appResponse = {
      refund_request_id: "rr_123",
      decision: "needs_review",
      reason: "Human approval required for refunds between $50 and $500",
      review_url: "/app/refund-requests/rr_123",
    } satisfies RefundRequestCreateResponse;
    const coreResponse = {
      refund_request_id: "rr_456",
      decision: "allowed",
      reason: "Refund allowed by policy.",
      review_url: "/app/refund-requests/rr_456",
    } satisfies CoreRefundRequestCreateResponse;
    const appToCore: CoreRefundRequestPublicResponse = appResponse;
    const coreToApp: RefundRequestPublicResponse = coreResponse;

    expect(appToCore.refund_request_id).toBe("rr_123");
    expect(coreToApp.refund_request_id).toBe("rr_456");
  });

  it("types approve, reject, execute, and error response fields", () => {
    const approved = {
      refund_request_id: "rr_123",
      status: "approved",
      decision: "approved",
      outcome: "approved",
      review_url: "/app/refund-requests/rr_123",
      message: "Refund approved.",
    } satisfies RefundRequestReviewResponse;
    const rejected = {
      refund_request_id: "rr_123",
      status: "rejected",
      decision: "rejected",
      outcome: "rejected",
      review_url: "/app/refund-requests/rr_123",
      message: "Refund rejected.",
    } satisfies RefundRequestReviewResponse;
    const executed = {
      refund_request_id: "rr_123",
      status: "executed",
      outcome: "executed",
      review_url: "/app/refund-requests/rr_123",
      message: "Demo execution recorded.",
    } satisfies RefundRequestExecutionResponse;
    const error = {
      error: "not_executable",
      refund_request_id: "rr_123",
      message: "Blocked refund requests cannot be executed.",
    } satisfies RefundRequestErrorResponse;

    expect([approved.outcome, rejected.outcome, executed.outcome]).toEqual([
      "approved",
      "rejected",
      "executed",
    ]);
    expect(error.message).not.toMatch(/live money/i);
  });

  it("types the refund response mapper with public response contracts", () => {
    const approved: RefundRequestPublicResponse = toRefundRequestBody(
      {
        [internalIdKey]: "rr_123",
        status: "APPROVED",
        decision: "approved",
        reason: `${forbiddenPublicTerms.legacyModel} approved.`,
      },
      {
        action: "approve",
        fallbackId: "rr_123",
      },
    );
    const executed: RefundRequestPublicResponse = toRefundRequestBody(
      {
        [internalIdKey]: "rr_123",
        status: "SUCCEEDED",
        execution_mode: legacyModeValue,
        message: ["Dry", "-run execution completed."].join(""),
      },
      {
        action: "execute",
        fallbackId: "rr_123",
      },
    );

    expect(approved).toEqual({
      refund_request_id: "rr_123",
      status: "approved",
      decision: "approved",
      outcome: "approved",
      review_url: "/app/refund-requests/rr_123",
      message: "Refund approved.",
    });
    expect(executed).toEqual({
      refund_request_id: "rr_123",
      status: "executed",
      outcome: "executed",
      review_url: "/app/refund-requests/rr_123",
      message: "Demo execution recorded.",
    });
    expect(JSON.stringify([approved, executed])).not.toMatch(/live money/i);
  });

  it("keeps @refundhold/core out of non-contract app runtime source", () => {
    const matches = scanSourceForCoreImports();

    expect(matches).toEqual(["src/lib/public-contracts/refund-requests.ts"]);
  });
});

function scanSourceForCoreImports() {
  const root = process.cwd();
  const srcRoot = join(root, "src");
  const matches: string[] = [];
  const stack = [srcRoot];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    const stat = statSync(current);

    if (stat.isDirectory()) {
      for (const child of readdirSync(current)) {
        stack.push(join(current, child));
      }
      continue;
    }

    if (
      (!current.endsWith(".ts") && !current.endsWith(".tsx")) ||
      current.endsWith(".test.ts") ||
      current.endsWith(".test.tsx")
    ) {
      continue;
    }

    const source = readFileSync(current, "utf8");

    if (source.includes("@refundhold/core")) {
      matches.push(relative(root, current));
    }
  }

  return matches.sort();
}
