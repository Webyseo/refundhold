import "dotenv/config";

import { pathToFileURL } from "node:url";

import { z } from "zod";

import { readConfiguredDemoAgentApiKey } from "../src/lib/security/api-keys";

const defaultBaseUrl = "http://localhost:3000";
export const defaultDemoReviewerEmail = "demo.reviewer@refundhold.com";

const actionRequestResponseSchema = z
  .object({
    decision: z.enum(["allow", "deny", "approval_required"]),
    action_request_id: z.string().min(1),
    reason: z.string().min(1),
    approval_url: z.string().min(1).optional(),
  })
  .passthrough();

const approvalResponseSchema = z
  .object({
    action_request_id: z.string().min(1),
    approval_id: z.string().min(1),
    status: z.enum(["APPROVED", "REJECTED"]),
    decision: z.enum(["approved", "rejected"]),
    reason: z.string().min(1),
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
    connector: "stripe_test",
    action: "refund.create",
    resource: {
      refund_id: `approval_flow_refund_${label}`,
    },
    parameters: {
      amount: 100,
      currency: "USD",
    },
    context: {
      source: "local_e2e_approval_flow",
    },
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
      "REFUNDHOLD_DEMO_AGENT_API_KEY is required. Copy .env.example to .env, set a local demo key, run pnpm db:seed:demo, then run this smoke test. AUTHRAIL_DEMO_AGENT_API_KEY remains supported as a legacy fallback.",
    );
  }

  return {
    baseUrl:
      process.env["AUTHRAIL_ACTION_REQUEST_BASE_URL"]?.trim() ??
      defaultBaseUrl,
    apiKey: configuredApiKey.apiKey,
    reviewerEmail:
      process.env["AUTHRAIL_DEMO_REVIEWER_EMAIL"]?.trim() ??
      defaultDemoReviewerEmail,
  };
}

export async function runApprovalFlowSmokeTest(
  config: ApprovalFlowSmokeConfig = readApprovalFlowSmokeConfig(),
) {
  const baseUrl = config.baseUrl.replace(/\/$/, "");

  const approveActionRequestId = await createReviewableActionRequest({
    baseUrl,
    apiKey: config.apiKey,
    label: `approve_${Date.now()}`,
  });
  const approved = await reviewActionRequest({
    baseUrl,
    actionRequestId: approveActionRequestId,
    action: "approve",
    reviewerEmail: config.reviewerEmail,
    comment: "Approved by local approval flow smoke test.",
  });

  if (approved.status !== "APPROVED" || approved.decision !== "approved") {
    throw new Error(
      `Expected approve response to return APPROVED, received ${JSON.stringify(approved)}.`,
    );
  }

  console.log(
    `approve ${approveActionRequestId} -> ${approved.status} (${approved.approval_id})`,
  );

  const rejectActionRequestId = await createReviewableActionRequest({
    baseUrl,
    apiKey: config.apiKey,
    label: `reject_${Date.now()}`,
  });
  const rejected = await reviewActionRequest({
    baseUrl,
    actionRequestId: rejectActionRequestId,
    action: "reject",
    reviewerEmail: config.reviewerEmail,
    comment: "Rejected by local approval flow smoke test.",
  });

  if (rejected.status !== "REJECTED" || rejected.decision !== "rejected") {
    throw new Error(
      `Expected reject response to return REJECTED, received ${JSON.stringify(rejected)}.`,
    );
  }

  console.log(
    `reject ${rejectActionRequestId} -> ${rejected.status} (${rejected.approval_id})`,
  );
}

async function createReviewableActionRequest({
  baseUrl,
  apiKey,
  label,
}: {
  baseUrl: string;
  apiKey: string;
  label: string;
}) {
  const response = await fetch(`${baseUrl}/api/v1/action-requests`, {
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
      `Expected action request creation to return 201, received ${response.status}: ${JSON.stringify(responseBody)}`,
    );
  }

  const parsed = actionRequestResponseSchema.parse(responseBody);

  if (parsed.decision !== "approval_required") {
    throw new Error(
      `Expected 100 USD refund to require approval, received ${parsed.decision}.`,
    );
  }

  return parsed.action_request_id;
}

async function reviewActionRequest({
  baseUrl,
  actionRequestId,
  action,
  reviewerEmail,
  comment,
}: {
  baseUrl: string;
  actionRequestId: string;
  action: ApprovalAction;
  reviewerEmail: string;
  comment: string;
}) {
  const response = await fetch(
    `${baseUrl}/api/v1/action-requests/${actionRequestId}/${action}`,
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
