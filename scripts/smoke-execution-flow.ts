import "dotenv/config";

import { pathToFileURL } from "node:url";

import { z } from "zod";

import { readOptionalEnvWithLegacy } from "../src/lib/env";
import { readConfiguredDemoAgentApiKey } from "../src/lib/security/api-keys";

const defaultBaseUrl = "http://localhost:3000";
const defaultDemoReviewerEmail = "demo.reviewer@refundhold.com";

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
    status: z.enum(["approved"]),
    decision: z.enum(["approved"]),
    outcome: z.enum(["approved"]),
    review_url: z.string().min(1),
    message: z.string().min(1),
  })
  .passthrough();

const executionResponseSchema = z
  .object({
    refund_request_id: z.string().min(1),
    status: z.enum(["executed", "failed"]),
    outcome: z.enum(["executed", "failed"]),
    review_url: z.string().min(1).optional(),
    message: z.string().min(1),
  })
  .passthrough();

const rejectedExecutionResponseSchema = z
  .object({
    error: z.string().min(1),
    message: z.string().min(1),
  })
  .passthrough();

export type ExecutionFlowSmokeConfig = {
  baseUrl: string;
  apiKey: string;
  reviewerEmail: string;
};

export function buildExecutionFlowRefundRequest(label: string) {
  return {
    stripe_mode: "demo_simulation",
    amount: 10000,
    currency: "usd",
    reason: `AI support agent recommends a test refund for execution flow ${label}.`,
  };
}

export function buildDemoSimulationExecutionRequest(
  metadata: Record<string, unknown>,
) {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      metadata,
    }),
  } satisfies RequestInit;
}

export function readExecutionFlowSmokeConfig(): ExecutionFlowSmokeConfig {
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

export async function runExecutionFlowSmokeTest(
  config: ExecutionFlowSmokeConfig = readExecutionFlowSmokeConfig(),
) {
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  logSmokeSafetyBoundary();

  const refundRequestId = await createReviewableRefundRequest({
    baseUrl,
    apiKey: config.apiKey,
    label: `execute_${Date.now()}`,
  });
  const approved = await approveRefundRequest({
    baseUrl,
    refundRequestId,
    reviewerEmail: config.reviewerEmail,
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
    `approve refund request ${refundRequestId} -> ${approved.status}: ${approved.message}`,
  );

  const executed = await executeRefundRequest({
    baseUrl,
    refundRequestId,
    expectedStatus: 200,
  });

  if (executed.status !== "executed" || executed.outcome !== "executed") {
    throw new Error(
      `Expected execute response to return executed, received ${JSON.stringify(executed)}.`,
    );
  }

  console.log(
    `execute refund request ${refundRequestId} -> ${executed.status}: ${executed.message}`,
  );

  await assertSecondExecutionRejected({
    baseUrl,
    refundRequestId,
  });

  console.log(`execute refund request ${refundRequestId} again -> rejected`);
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
    body: JSON.stringify(buildExecutionFlowRefundRequest(label)),
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

async function approveRefundRequest({
  baseUrl,
  refundRequestId,
  reviewerEmail,
}: {
  baseUrl: string;
  refundRequestId: string;
  reviewerEmail: string;
}) {
  const response = await fetch(
    `${baseUrl}/api/v1/refund-requests/${refundRequestId}/approve`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-refundhold-reviewer-email": reviewerEmail,
      },
      body: JSON.stringify({
        comment: "Approved by local execution flow smoke test.",
      }),
    },
  );
  const responseBody: unknown = await response.json().catch(() => null);

  if (response.status !== 200) {
    throw new Error(
      `Expected approve to return 200, received ${response.status}: ${JSON.stringify(responseBody)}`,
    );
  }

  return approvalResponseSchema.parse(responseBody);
}

async function executeRefundRequest({
  baseUrl,
  refundRequestId,
  expectedStatus,
}: {
  baseUrl: string;
  refundRequestId: string;
  expectedStatus: number;
}) {
  const response = await fetch(
    `${baseUrl}/api/v1/refund-requests/${refundRequestId}/execute`,
    buildDemoSimulationExecutionRequest({
      source: "local_e2e_execution_flow",
    }),
  );
  const responseBody: unknown = await response.json().catch(() => null);

  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected execute to return ${expectedStatus}, received ${response.status}: ${JSON.stringify(responseBody)}`,
    );
  }

  return executionResponseSchema.parse(responseBody);
}

async function assertSecondExecutionRejected({
  baseUrl,
  refundRequestId,
}: {
  baseUrl: string;
  refundRequestId: string;
}) {
  const response = await fetch(
    `${baseUrl}/api/v1/refund-requests/${refundRequestId}/execute`,
    buildDemoSimulationExecutionRequest({
      source: "local_e2e_execution_flow_duplicate",
    }),
  );
  const responseBody: unknown = await response.json().catch(() => null);

  if (response.status !== 409) {
    throw new Error(
      `Expected duplicate execute to return 409, received ${response.status}: ${JSON.stringify(responseBody)}`,
    );
  }

  const parsed = rejectedExecutionResponseSchema.parse(responseBody);

  if (parsed.error !== "already_executed") {
    throw new Error(
      `Expected duplicate execute to fail as already_executed, received ${JSON.stringify(parsed)}.`,
    );
  }
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
  runExecutionFlowSmokeTest().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
