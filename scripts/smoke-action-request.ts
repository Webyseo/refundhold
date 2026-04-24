import "dotenv/config";

import { pathToFileURL } from "node:url";

import { z } from "zod";

const defaultBaseUrl = "http://localhost:3000";
const apiPath = "/api/v1/action-requests";

const actionRequestResponseSchema = z
  .object({
    decision: z.enum(["allow", "deny", "approval_required"]),
    action_request_id: z.string().min(1),
    reason: z.string().min(1),
    approval_url: z.string().min(1).optional(),
  })
  .passthrough();

type ActionRequestDecision = z.infer<
  typeof actionRequestResponseSchema
>["decision"];

export type RefundSmokeCase = {
  amount: number;
  expectedDecision: ActionRequestDecision;
};

export type SmokeConfig = {
  baseUrl: string;
  apiKey: string;
};

export const refundSmokeCases = [
  {
    amount: 25,
    expectedDecision: "allow",
  },
  {
    amount: 100,
    expectedDecision: "approval_required",
  },
  {
    amount: 750,
    expectedDecision: "deny",
  },
] satisfies RefundSmokeCase[];

export function buildRefundActionRequestPayload(amount: number) {
  return {
    connector: "stripe_test",
    action: "refund.create",
    resource: {
      refund_id: `smoke_refund_${amount}`,
    },
    parameters: {
      amount,
      currency: "EUR",
    },
    context: {
      source: "local_e2e_smoke",
    },
  };
}

export function readSmokeConfig(): SmokeConfig {
  const apiKey = process.env["AUTHRAIL_DEMO_AGENT_API_KEY"]?.trim();

  if (!apiKey) {
    throw new Error(
      "AUTHRAIL_DEMO_AGENT_API_KEY is required. Copy .env.example to .env, run pnpm db:seed, then run this smoke test.",
    );
  }

  return {
    baseUrl:
      process.env["AUTHRAIL_ACTION_REQUEST_BASE_URL"]?.trim() ?? defaultBaseUrl,
    apiKey,
  };
}

export async function runActionRequestSmokeTest(
  config: SmokeConfig = readSmokeConfig(),
) {
  const baseUrl = config.baseUrl.replace(/\/$/, "");

  for (const smokeCase of refundSmokeCases) {
    const response = await postActionRequest({
      url: `${baseUrl}${apiPath}`,
      apiKey: config.apiKey,
      amount: smokeCase.amount,
    });

    if (response.decision !== smokeCase.expectedDecision) {
      throw new Error(
        `Expected ${smokeCase.expectedDecision} for ${smokeCase.amount} EUR refund, received ${response.decision}.`,
      );
    }

    if (
      smokeCase.expectedDecision === "approval_required" &&
      !response.approval_url
    ) {
      throw new Error(
        "Expected approval_required response to include approval_url.",
      );
    }

    console.log(
      `${smokeCase.amount} EUR refund -> ${response.decision} (${response.action_request_id})`,
    );
  }
}

async function postActionRequest({
  url,
  apiKey,
  amount,
}: {
  url: string;
  apiKey: string;
  amount: number;
}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(buildRefundActionRequestPayload(amount)),
  });
  const responseBody: unknown = await response.json().catch(() => null);

  if (response.status !== 201) {
    throw new Error(
      `Expected ${url} to return 201 for ${amount} EUR refund, received ${response.status}: ${JSON.stringify(responseBody)}`,
    );
  }

  return actionRequestResponseSchema.parse(responseBody);
}

function isMainModule() {
  const entrypoint = process.argv[1];

  return entrypoint
    ? import.meta.url === pathToFileURL(entrypoint).href
    : false;
}

if (isMainModule()) {
  runActionRequestSmokeTest().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
