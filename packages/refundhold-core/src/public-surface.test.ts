import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type {
  RefundDecision,
  RefundMode,
  RefundRequestCreateInput,
  RefundRequestCreateResponse,
  RefundRequestExecutionResponse,
  RefundRequestPublicResponse,
  RefundRequestReviewResponse,
  RefundStatus,
} from "./index";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const forbiddenPublicTerms = [
  "AuthRail",
  "authrail",
  "AUTHRAIL_",
  "ActionRequest",
  "action_request_id",
  "action-requests",
  "connector",
  "dry_run",
];

describe("@refundhold/core public surface", () => {
  it("does not expose legacy or internal terms in public package files", () => {
    const publicFiles = listPublicPackageFiles(packageRoot);

    expect(publicFiles).toEqual(
      expect.arrayContaining([
        path.join(packageRoot, "README.md"),
        path.join(packageRoot, "package.json"),
        path.join(packageRoot, "src", "index.ts"),
        path.join(packageRoot, "src", "refund-requests.ts"),
        path.join(packageRoot, "src", "demo-policy.ts"),
      ]),
    );

    for (const file of publicFiles) {
      const source = readFileSync(file, "utf8");

      for (const term of forbiddenPublicTerms) {
        expect(source, `${path.relative(packageRoot, file)} contains ${term}`)
          .not.toContain(term);
      }
    }
  });

  it("exports public refund request contract types", () => {
    const decision = "needs_review" satisfies RefundDecision;
    const status = "executed" satisfies RefundStatus;
    const mode = "demo_simulation" satisfies RefundMode;
    const input = {
      stripe_mode: mode,
      amount: 42000,
      currency: "usd",
      reason: "AI-proposed Stripe refund needs review.",
    } satisfies RefundRequestCreateInput;
    const createResponse = {
      refund_request_id: "rr_demo_123",
      decision,
      reason: "Refund request needs human review.",
      review_url: "/app/refund-requests/rr_demo_123",
    } satisfies RefundRequestCreateResponse;
    const reviewResponse = {
      refund_request_id: "rr_demo_123",
      status: "approved",
      decision: "approved",
      outcome: "approved",
      review_url: "/app/refund-requests/rr_demo_123",
      message: "Refund approved.",
    } satisfies RefundRequestReviewResponse;
    const executionResponse = {
      refund_request_id: "rr_demo_123",
      status,
      outcome: "executed",
      review_url: "/app/refund-requests/rr_demo_123",
      message: "Demo execution recorded.",
    } satisfies RefundRequestExecutionResponse;
    const publicResponse: RefundRequestPublicResponse = executionResponse;

    expect(input.stripe_mode).toBe("demo_simulation");
    expect(createResponse.refund_request_id).toBe("rr_demo_123");
    expect(reviewResponse.outcome).toBe("approved");
    expect(publicResponse.message).toBe("Demo execution recorded.");
  });
});

function listPublicPackageFiles(root: string) {
  const files: string[] = [];
  const stack = [
    path.join(root, "README.md"),
    path.join(root, "package.json"),
    path.join(root, "src"),
  ];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    const stat = statSync(current);

    if (stat.isDirectory()) {
      for (const child of readdirSync(current)) {
        stack.push(path.join(current, child));
      }
      continue;
    }

    if (!current.endsWith(".test.ts")) {
      files.push(current);
    }
  }

  return files.sort();
}
