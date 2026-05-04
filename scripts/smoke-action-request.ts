import "dotenv/config";

import { pathToFileURL } from "node:url";

import { z } from "zod";

import { readOptionalEnvWithLegacy } from "../src/lib/env";
import { readConfiguredDemoAgentApiKey } from "../src/lib/security/api-keys";

const defaultBaseUrl = "http://localhost:3000";
const apiPath = "/api/v1/refund-requests";

const refundRequestResponseSchema = z
  .object({
    refund_request_id: z.string().min(1),
    decision: z.enum(["allowed", "needs_review", "blocked"]),
    reason: z.string().min(1),
    review_url: z.string().min(1).optional(),
  })
  .passthrough();

type RefundRequestDecision = z.infer<
  typeof refundRequestResponseSchema
>["decision"];

export type RefundSmokeCase = {
  amountUsd: number;
  expectedDecision: RefundRequestDecision;
};

export type SmokeConfig = {
  baseUrl: string;
  apiKey: string;
};

export const refundSmokeCases = [
  {
    amountUsd: 25,
    expectedDecision: "allowed",
  },
  {
    amountUsd: 100,
    expectedDecision: "needs_review",
  },
  {
    amountUsd: 750,
    expectedDecision: "blocked",
  },
] satisfies RefundSmokeCase[];

export function buildRefundRequestPayload(amountUsd: number) {
  return {
    stripe_mode: "demo_simulation",
    amount: amountUsd * 100,
    currency: "usd",
    reason: `AI support agent recommends a $${amountUsd.toFixed(2)} refund.`,
  };
}

export function readSmokeConfig(): SmokeConfig {
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
  };
}

export async function runRefundRequestSmokeTest(
  config: SmokeConfig = readSmokeConfig(),
) {
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  logSmokeSafetyBoundary();

  for (const smokeCase of refundSmokeCases) {
    const response = await postRefundRequest({
      url: `${baseUrl}${apiPath}`,
      apiKey: config.apiKey,
      amountUsd: smokeCase.amountUsd,
    });

    if (response.decision !== smokeCase.expectedDecision) {
      throw new Error(
        `Expected ${smokeCase.expectedDecision} for ${smokeCase.amountUsd} USD refund request, received ${response.decision}.`,
      );
    }

    if (
      smokeCase.expectedDecision === "needs_review" &&
      !response.review_url
    ) {
      throw new Error(
        "Expected needs_review response to include review_url.",
      );
    }

    console.log(
      `${smokeCase.amountUsd} USD refund request -> ${response.decision} (${response.refund_request_id})`,
    );
  }
}

async function postRefundRequest({
  url,
  apiKey,
  amountUsd,
}: {
  url: string;
  apiKey: string;
  amountUsd: number;
}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(buildRefundRequestPayload(amountUsd)),
  });
  const responseBody: unknown = await response.json().catch(() => null);

  if (response.status !== 201) {
    throw new Error(
      `Expected ${url} to return 201 for ${amountUsd} USD refund request, received ${response.status}: ${JSON.stringify(responseBody)}`,
    );
  }

  return refundRequestResponseSchema.parse(responseBody);
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
  runRefundRequestSmokeTest().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
