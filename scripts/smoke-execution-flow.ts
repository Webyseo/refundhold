import "dotenv/config";

import { pathToFileURL } from "node:url";

import { z } from "zod";

import { readConfiguredDemoAgentApiKey } from "../src/lib/security/api-keys";

const defaultBaseUrl = "http://localhost:3000";
const defaultDemoReviewerEmail = "demo.reviewer@refundhold.com";

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

const executionResponseSchema = z
  .object({
    action_request_id: z.string().min(1),
    execution_id: z.string().min(1),
    status: z.enum(["EXECUTED", "SUCCEEDED"]),
    execution_mode: z.literal("dry_run"),
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
    connector: "stripe_test",
    action: "refund.create",
    resource: {
      refund_id: `execution_flow_refund_${label}`,
    },
    parameters: {
      amount: 100,
      currency: "USD",
    },
    context: {
      source: "local_e2e_execution_flow",
    },
  };
}

export function buildDryRunExecutionRequest(metadata: Record<string, unknown>) {
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

export async function runExecutionFlowSmokeTest(
  config: ExecutionFlowSmokeConfig = readExecutionFlowSmokeConfig(),
) {
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const actionRequestId = await createReviewableActionRequest({
    baseUrl,
    apiKey: config.apiKey,
    label: `execute_${Date.now()}`,
  });
  const approved = await approveActionRequest({
    baseUrl,
    actionRequestId,
    reviewerEmail: config.reviewerEmail,
  });

  if (approved.status !== "APPROVED" || !approved.approval_id) {
    throw new Error(
      `Expected approve response to return APPROVED with approval_id, received ${JSON.stringify(approved)}.`,
    );
  }

  console.log(
    `approve ${actionRequestId} -> ${approved.status} (${approved.approval_id})`,
  );

  const executed = await executeActionRequest({
    baseUrl,
    actionRequestId,
    expectedStatus: 200,
  });

  if (
    executed.status !== "SUCCEEDED" &&
    executed.status !== "EXECUTED"
  ) {
    throw new Error(
      `Expected execute response to return SUCCEEDED or EXECUTED, received ${JSON.stringify(executed)}.`,
    );
  }

  console.log(
    `execute ${actionRequestId} -> ${executed.status} (${executed.execution_id}, ${executed.execution_mode})`,
  );

  await assertSecondExecutionRejected({
    baseUrl,
    actionRequestId,
  });

  console.log(`execute ${actionRequestId} again -> rejected`);
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
    body: JSON.stringify(buildExecutionFlowRefundRequest(label)),
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

async function approveActionRequest({
  baseUrl,
  actionRequestId,
  reviewerEmail,
}: {
  baseUrl: string;
  actionRequestId: string;
  reviewerEmail: string;
}) {
  const response = await fetch(
    `${baseUrl}/api/v1/action-requests/${actionRequestId}/approve`,
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

async function executeActionRequest({
  baseUrl,
  actionRequestId,
  expectedStatus,
}: {
  baseUrl: string;
  actionRequestId: string;
  expectedStatus: number;
}) {
  const response = await fetch(
    `${baseUrl}/api/v1/action-requests/${actionRequestId}/execute`,
    buildDryRunExecutionRequest({
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
  actionRequestId,
}: {
  baseUrl: string;
  actionRequestId: string;
}) {
  const response = await fetch(
    `${baseUrl}/api/v1/action-requests/${actionRequestId}/execute`,
    buildDryRunExecutionRequest({
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
