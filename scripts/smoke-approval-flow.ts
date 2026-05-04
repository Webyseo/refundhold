import "dotenv/config";

import { pathToFileURL } from "node:url";

import { z } from "zod";

import { readOptionalEnvWithLegacy } from "../src/lib/env";
import { readConfiguredDemoAgentApiKey } from "../src/lib/security/api-keys";

const defaultBaseUrl = "http://localhost:3000";
export const defaultDemoReviewerEmail = "demo.reviewer@refundhold.com";

const refundRequestResponseSchema = z
  .object({
    refund_request_id: z.string().min(1),
    decision: z.enum(["allowed", "needs_review", "blocked"]),
    reason: z.string().min(1),
    review_url: z.string().min(1).optional(),
  })
  .passthrough();

const approvalResponseSchema = z
  .object({
    refund_request_id: z.string().min(1),
    status: z.enum(["approved", "rejected"]),
    decision: z.enum(["approved", "rejected"]),
    outcome: z.enum(["approved", "rejected"]),
    review_url: z.string().min(1),
    message: z.string().min(1),
  })
  .passthrough();

type ApprovalAction = "approve" | "reject";

export type ApprovalFlowSmokeConfig = {
  baseUrl: string;
  apiKey: string;
  reviewerEmail: string;
};

export function buildReviewableRefundRequest(label: string) {
  return {
    stripe_mode: "demo_simulation",
    amount: 10000,
    currency: "usd",
    reason: `AI support agent recommends a test refund for approval flow ${label}.`,
  };
}

export function buildApprovalReviewRequest({
  reviewerEmail,
  comment,
}: {
  reviewerEmail: string;
  comment: string;
}) {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-refundhold-reviewer-email": reviewerEmail,
    },
    body: JSON.stringify({
      comment,
    }),
  } satisfies RequestInit;
}

export function readApprovalFlowSmokeConfig(): ApprovalFlowSmokeConfig {
  const configuredApiKey = readConfiguredDemoAgentApiKey();

  if (!configuredApiKey) {
    throw new Error(
      "REFUNDHOLD_DEMO_AGENT_API_KEY is required. Copy .env.example to .env, set a local demo key, run pnpm db:seed:demo, then run this smoke test.",
    );
  }

  return {
    baseUrl:
      readOptionalEnvWithLegacy(
        process.env,
        "REFUNDHOLD_SMOKE_BASE_URL",
        "AUTHRAIL_ACTION_REQUEST_BASE_URL",
      ) ?? defaultBaseUrl,
    apiKey: configuredApiKey.apiKey,
    reviewerEmail:
      readOptionalEnvWithLegacy(
        process.env,
        "REFUNDHOLD_DEMO_REVIEWER_EMAIL",
        "AUTHRAIL_DEMO_REVIEWER_EMAIL",
      ) ??
      defaultDemoReviewerEmail,
  };
}

export async function runApprovalFlowSmokeTest(
  config: ApprovalFlowSmokeConfig = readApprovalFlowSmokeConfig(),
) {
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  logSmokeSafetyBoundary();

  const approveRefundRequestId = await createReviewableRefundRequest({
    baseUrl,
    apiKey: config.apiKey,
    label: `approve_${Date.now()}`,
  });
  const approved = await reviewRefundRequest({
    baseUrl,
    refundRequestId: approveRefundRequestId,
    action: "approve",
    reviewerEmail: config.reviewerEmail,
    comment: "Approved by local approval flow smoke test.",
  });

  if (
    approved.status !== "approved" ||
    approved.decision !== "approved" ||
    approved.outcome !== "approved"
  ) {
    throw new Error(
      `Expected approve response to return approved, received ${JSON.stringify(approved)}.`,
    );
  }

  console.log(
    `approve refund request ${approveRefundRequestId} -> ${approved.status}: ${approved.message}`,
  );

  const rejectRefundRequestId = await createReviewableRefundRequest({
    baseUrl,
    apiKey: config.apiKey,
    label: `reject_${Date.now()}`,
  });
  const rejected = await reviewRefundRequest({
    baseUrl,
    refundRequestId: rejectRefundRequestId,
    action: "reject",
    reviewerEmail: config.reviewerEmail,
    comment: "Rejected by local approval flow smoke test.",
  });

  if (
    rejected.status !== "rejected" ||
    rejected.decision !== "rejected" ||
    rejected.outcome !== "rejected"
  ) {
    throw new Error(
      `Expected reject response to return rejected, received ${JSON.stringify(rejected)}.`,
    );
  }

  console.log(
    `reject refund request ${rejectRefundRequestId} -> ${rejected.status}: ${rejected.message}`,
  );
}

async function createReviewableRefundRequest({
  baseUrl,
  apiKey,
  label,
}: {
  baseUrl: string;
  apiKey: string;
  label: string;
}) {
  const response = await fetch(`${baseUrl}/api/v1/refund-requests`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(buildReviewableRefundRequest(label)),
  });
  const responseBody: unknown = await response.json().catch(() => null);

  if (response.status !== 201) {
    throw new Error(
      `Expected refund request creation to return 201, received ${response.status}: ${JSON.stringify(responseBody)}`,
    );
  }

  const parsed = refundRequestResponseSchema.parse(responseBody);

  if (parsed.decision !== "needs_review") {
    throw new Error(
      `Expected 100 USD refund to require approval, received ${parsed.decision}.`,
    );
  }

  return parsed.refund_request_id;
}

async function reviewRefundRequest({
  baseUrl,
  refundRequestId,
  action,
  reviewerEmail,
  comment,
}: {
  baseUrl: string;
  refundRequestId: string;
  action: ApprovalAction;
  reviewerEmail: string;
  comment: string;
}) {
  const response = await fetch(
    `${baseUrl}/api/v1/refund-requests/${refundRequestId}/${action}`,
    buildApprovalReviewRequest({
      reviewerEmail,
      comment,
    }),
  );
  const responseBody: unknown = await response.json().catch(() => null);

  if (response.status !== 200) {
    throw new Error(
      `Expected ${action} to return 200, received ${response.status}: ${JSON.stringify(responseBody)}`,
    );
  }

  return approvalResponseSchema.parse(responseBody);
}

function logSmokeSafetyBoundary() {
  console.log(
    "Safety: Demo simulation does not move money. Stripe test-mode uses test objects only. Live refunds are blocked in v1. The AI agent must not receive Stripe secret keys.",
  );
}

function isMainModule() {
  const entrypoint = process.argv[1];

  return entrypoint
    ? import.meta.url === pathToFileURL(entrypoint).href
    : false;
}

if (isMainModule()) {
  runApprovalFlowSmokeTest().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
