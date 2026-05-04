import "dotenv/config";

import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

import Stripe from "stripe";
import { z } from "zod";

import {
  DEMO_ACCESS_COOKIE_NAME,
  createDemoAccessCookieValue,
} from "../src/lib/demo-access";
import { getPrismaClient } from "../src/lib/db/prisma";
import {
  isEnabledValue,
  readEnabledEnvWithLegacy,
  readOptionalEnvWithLegacy,
} from "../src/lib/env";
import { readConfiguredDemoAgentApiKey } from "../src/lib/security/api-keys";

type StripeE2EEnv = {
  [key: string]: string | undefined;
};

type StripeE2EConfig = {
  baseUrl: string;
  apiKey: string;
  reviewerEmail: string;
  testSecretKey: string;
  webhookTestSecret: string | null;
  amountMinor: number;
  currency: string;
  expectWebhook: boolean;
  webhookWaitMs: number;
  demoAccessEnabled: boolean;
  demoAccessPassword: string | null;
};

type JsonRecord = Record<string, unknown>;

type HttpJsonResponse = {
  status: number;
  body: unknown;
};

type StripeE2EClient = {
  paymentIntents: {
    create: (
      params: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => Promise<unknown>;
  };
};

type StripeRefundDatabaseRecord = {
  id: string;
  actionRequestId: string;
  executionId: string;
  stripeRefundId: string | null;
  stripeStatus: string | null;
  amountMinor: number;
  currency: string;
  idempotencyKeyHash: string;
};

type StripeWebhookDatabaseRecord = {
  id: string;
  type: string;
  status: "RECEIVED" | "PROCESSED" | "IGNORED" | "FAILED";
  objectId: string | null;
  errorMessage: string | null;
  processedAt: Date | null;
};

type StripeE2EPrismaClient = {
  stripeRefund: {
    findUnique: (args: unknown) => Promise<StripeRefundDatabaseRecord | null>;
  };
  stripeWebhookEvent: {
    findFirst: (args: unknown) => Promise<StripeWebhookDatabaseRecord | null>;
  };
  $disconnect?: () => Promise<void>;
};

const defaultReviewerEmail = "demo.reviewer@refundhold.com";
const defaultAmountMinor = 10000;
const defaultCurrency = "usd";
const defaultWebhookWaitMs = 20000;
const testSecretPrefixes = [
  `${"sk"}_${"test"}_`,
  `${"rk"}_${"test"}_`,
];
const liveSecretPrefixes = [
  `${"sk"}_${"live"}_`,
  `${"rk"}_${"live"}_`,
];

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
    status: z.literal("APPROVED"),
    decision: z.literal("approved"),
    reason: z.string().min(1),
  })
  .passthrough();

const stripeExecutionResponseSchema = z
  .object({
    action_request_id: z.string().min(1),
    execution_id: z.string().min(1),
    stripe_refund_id: z.string().min(1),
    status: z.literal("SUCCEEDED"),
    execution_mode: z.literal("stripe_test_refund"),
    message: z.string().min(1),
  })
  .passthrough();

const duplicateExecutionResponseSchema = z
  .object({
    error: z.literal("already_executed"),
    message: z.string().min(1),
  })
  .passthrough();

export function readStripeTestE2EConfig(
  env: StripeE2EEnv = process.env,
): StripeE2EConfig {
  if (isEnabledValue(env["CI"]) && !isEnabledValue(env["REFUNDHOLD_STRIPE_E2E_ALLOW_CI"])) {
    throw new Error(
      "Stripe test-mode E2E is disabled in CI unless REFUNDHOLD_STRIPE_E2E_ALLOW_CI=true.",
    );
  }

  if (
    isEnabledValue(env["REFUNDHOLD_STRIPE_LIVE_REFUNDS_ENABLED"]) ||
    isEnabledValue(env["AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED"])
  ) {
    throw new Error("AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED is blocked.");
  }

  if (
    !readEnabledEnvWithLegacy(
      env,
      "REFUNDHOLD_STRIPE_TEST_MODE_ENABLED",
      "AUTHRAIL_STRIPE_TEST_MODE_ENABLED",
    )
  ) {
    throw new Error("AUTHRAIL_STRIPE_TEST_MODE_ENABLED must be true.");
  }

  if (
    !readEnabledEnvWithLegacy(
      env,
      "REFUNDHOLD_STRIPE_TEST_REFUNDS_ENABLED",
      "AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED",
    )
  ) {
    throw new Error("AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED must be true.");
  }

  const testSecretKey = readRequiredEnvWithLegacy(
    env,
    "REFUNDHOLD_STRIPE_TEST_SECRET_KEY",
    "AUTHRAIL_STRIPE_TEST_SECRET_KEY",
  );

  if (startsWithAny(testSecretKey, liveSecretPrefixes)) {
    throw new Error("Live Stripe keys are not allowed.");
  }

  if (!startsWithAny(testSecretKey, testSecretPrefixes)) {
    throw new Error("A Stripe test-mode secret or restricted key is required.");
  }

  const configuredApiKey = readConfiguredDemoAgentApiKey(env);

  if (!configuredApiKey) {
    throw new Error(
      "REFUNDHOLD_DEMO_AGENT_API_KEY is required. AUTHRAIL_DEMO_AGENT_API_KEY remains supported as a legacy fallback.",
    );
  }

  const apiKey = configuredApiKey.apiKey;
  const baseUrl = normalizeBaseUrl(readRequiredEnv(env, "BASE_URL"), env);
  readRequiredEnv(env, "DATABASE_URL");
  const expectWebhook = isEnabledValue(env["STRIPE_E2E_EXPECT_WEBHOOK"]);
  const webhooksEnabled = readEnabledEnvWithLegacy(
    env,
    "REFUNDHOLD_STRIPE_WEBHOOKS_ENABLED",
    "AUTHRAIL_STRIPE_WEBHOOKS_ENABLED",
  );
  const webhookTestSecret = readOptionalEnvWithLegacy(
    env,
    "REFUNDHOLD_STRIPE_WEBHOOK_TEST_SECRET",
    "AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET",
  );

  if (webhooksEnabled && !webhookTestSecret) {
    throw new Error(
      "AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET is required when Stripe webhooks are enabled.",
    );
  }

  if (expectWebhook && (!webhooksEnabled || !webhookTestSecret)) {
    throw new Error(
      "STRIPE_E2E_EXPECT_WEBHOOK requires enabled Stripe webhooks and a webhook signing secret.",
    );
  }

  const demoAccessEnabled = readEnabledEnvWithLegacy(
    env,
    "REFUNDHOLD_DEMO_ACCESS_ENABLED",
    "AUTHRAIL_DEMO_ACCESS_ENABLED",
  );
  const demoAccessPassword = readOptionalEnvWithLegacy(
    env,
    "REFUNDHOLD_DEMO_ACCESS_PASSWORD",
    "AUTHRAIL_DEMO_ACCESS_PASSWORD",
  );

  if (demoAccessEnabled && !demoAccessPassword) {
    throw new Error(
      "AUTHRAIL_DEMO_ACCESS_PASSWORD is required when demo access is enabled.",
    );
  }

  return {
    baseUrl,
    apiKey,
    reviewerEmail:
      readOptionalEnvWithLegacy(
        env,
        "REFUNDHOLD_DEMO_REVIEWER_EMAIL",
        "AUTHRAIL_DEMO_REVIEWER_EMAIL",
      ) || defaultReviewerEmail,
    testSecretKey,
    webhookTestSecret,
    amountMinor: readPositiveIntegerEnv(
      env["STRIPE_E2E_AMOUNT_MINOR"],
      defaultAmountMinor,
    ),
    currency: env["STRIPE_E2E_CURRENCY"]?.trim().toLowerCase() || defaultCurrency,
    expectWebhook,
    webhookWaitMs: readPositiveIntegerEnv(
      env["STRIPE_E2E_WEBHOOK_WAIT_MS"],
      defaultWebhookWaitMs,
    ),
    demoAccessEnabled,
    demoAccessPassword,
  };
}

export function buildStripeRefundActionRequestPayload({
  paymentIntentId,
  amountMinor,
  runId,
}: {
  paymentIntentId: string;
  amountMinor: number;
  runId: string;
}) {
  return {
    connector: "stripe_test",
    action: "refund.create",
    resource: "stripe.payment_intent",
    parameters: {
      payment_intent_id: paymentIntentId,
      amount_minor: amountMinor,
      reason: "requested_by_customer",
    },
    context: {
      source: "stripe_test_mode_e2e",
      order_id: `stripe_e2e_${runId}`,
      ai_agent_reason:
        "Controlled local Stripe test-mode E2E refund validation.",
    },
  };
}

export function redactE2ESecretText(value: string): string {
  return value
    .replace(
      /\b(?:sk|rk)_(?:test|live)_[A-Za-z0-9_*]+\b/g,
      "[redacted_stripe_key]",
    )
    .replace(/\bwhsec_[A-Za-z0-9_*]+\b/g, "[redacted_webhook_secret]")
    .replace(/\bBearer\s+[A-Za-z0-9._:-]+\b/g, "Bearer [redacted_token]");
}

export function assertDuplicateExecuteRejected(response: HttpJsonResponse) {
  if (response.status !== 409) {
    throw new Error("Expected duplicate execute to fail with 409.");
  }

  duplicateExecutionResponseSchema.parse(response.body);
}

export async function runStripeTestModeE2EDemo({
  config = readStripeTestE2EConfig(),
  stripeClient,
  fetchImpl = fetch,
}: {
  config?: StripeE2EConfig;
  stripeClient?: StripeE2EClient;
  fetchImpl?: typeof fetch;
} = {}) {
  const runId = randomUUID();
  const stripe = stripeClient ?? createStripeClient(config.testSecretKey);
  const prisma = (await getPrismaClient()) as unknown as StripeE2EPrismaClient;

  try {
    const payment = await createStripeTestPaymentIntent({
      stripe,
      config,
      runId,
    });
    logStep("Stripe test PaymentIntent created", {
      paymentIntentId: payment.paymentIntentId,
      chargeId: payment.chargeId,
    });

    const actionRequest = await createRefundHoldActionRequest({
      config,
      fetchImpl,
      paymentIntentId: payment.paymentIntentId,
      runId,
    });
    logStep("RefundHold action request created", {
      actionRequestId: actionRequest.action_request_id,
      decision: actionRequest.decision,
    });

    if (actionRequest.decision !== "approval_required") {
      throw new Error(
        `Expected approval_required decision, received ${actionRequest.decision}.`,
      );
    }

    const approval = await approveActionRequest({
      config,
      fetchImpl,
      actionRequestId: actionRequest.action_request_id,
    });
    logStep("RefundHold action request approved", {
      actionRequestId: approval.action_request_id,
      approvalId: approval.approval_id,
    });

    const execution = await executeActionRequest({
      config,
      fetchImpl,
      actionRequestId: actionRequest.action_request_id,
    });
    logStep("Stripe test refund executed", {
      actionRequestId: execution.action_request_id,
      executionId: execution.execution_id,
      stripeRefundId: execution.stripe_refund_id,
    });

    const persistedRefund = await assertStripeRefundPersisted({
      prisma,
      actionRequestId: execution.action_request_id,
      executionId: execution.execution_id,
      stripeRefundId: execution.stripe_refund_id,
      amountMinor: config.amountMinor,
      currency: config.currency,
    });
    logStep("StripeRefund persisted", {
      actionRequestId: persistedRefund.actionRequestId,
      executionId: persistedRefund.executionId,
      stripeRefundId: persistedRefund.stripeRefundId,
      stripeStatus: persistedRefund.stripeStatus,
    });

    await retryExecuteAndAssertIdempotent({
      config,
      fetchImpl,
      actionRequestId: execution.action_request_id,
    });
    logStep("Duplicate execute rejected", {
      actionRequestId: execution.action_request_id,
    });

    const webhookEvent = await checkWebhookReconciliation({
      prisma,
      config,
      stripeRefundId: execution.stripe_refund_id,
    });

    if (webhookEvent) {
      logStep("Stripe webhook reconciled", {
        stripeRefundId: execution.stripe_refund_id,
        eventType: webhookEvent.type,
        webhookStatus: webhookEvent.status,
      });
    } else {
      logStep("Stripe webhook reconciliation not required for this run", {
        stripeRefundId: execution.stripe_refund_id,
      });
    }

    await assertUiShowsSafeStripeStatus({
      config,
      fetchImpl,
      actionRequestId: execution.action_request_id,
      stripeRefundId: execution.stripe_refund_id,
    });
    logStep("UI shows safe Stripe test-mode status", {
      actionRequestId: execution.action_request_id,
    });

    return {
      paymentIntentId: payment.paymentIntentId,
      chargeId: payment.chargeId,
      actionRequestId: execution.action_request_id,
      executionId: execution.execution_id,
      stripeRefundId: execution.stripe_refund_id,
      webhookReconciled: Boolean(webhookEvent),
    };
  } finally {
    await prisma.$disconnect?.();
  }
}

function createStripeClient(testSecretKey: string): StripeE2EClient {
  return new Stripe(testSecretKey, {
    appInfo: {
      name: "RefundHold Stripe test-mode E2E",
    },
  }) as unknown as StripeE2EClient;
}

async function createStripeTestPaymentIntent({
  stripe,
  config,
  runId,
}: {
  stripe: StripeE2EClient;
  config: StripeE2EConfig;
  runId: string;
}) {
  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: config.amountMinor,
      currency: config.currency,
      payment_method: "pm_card_visa",
      payment_method_types: ["card"],
      confirm: true,
      description: "RefundHold controlled Stripe test-mode E2E",
      metadata: {
        refundhold_e2e: "true",
        refundhold_mode: "test",
        refundhold_run_id: runId,
      },
      expand: ["latest_charge"],
    },
    {
      idempotencyKey: `refundhold:e2e:payment_intent:${runId}`,
    },
  );

  return readStripePaymentIntent(paymentIntent);
}

function readStripePaymentIntent(value: unknown) {
  if (!isRecord(value)) {
    throw new Error("Stripe PaymentIntent response was incomplete.");
  }

  const paymentIntentId = readRequiredString(value.id, "PaymentIntent id");
  const livemode = value.livemode;

  if (livemode !== false) {
    throw new Error("Stripe PaymentIntent must be test mode.");
  }

  return {
    paymentIntentId,
    chargeId: readExpandableId(value.latest_charge),
  };
}

async function createRefundHoldActionRequest({
  config,
  fetchImpl,
  paymentIntentId,
  runId,
}: {
  config: StripeE2EConfig;
  fetchImpl: typeof fetch;
  paymentIntentId: string;
  runId: string;
}) {
  const response = await postJson({
    fetchImpl,
    url: `${config.baseUrl}/api/v1/action-requests`,
    apiKey: config.apiKey,
    body: buildStripeRefundActionRequestPayload({
      paymentIntentId,
      amountMinor: config.amountMinor,
      runId,
    }),
  });

  if (response.status !== 201) {
    throw new Error(
      `Expected action request creation to return 201, received ${response.status}: ${safeJson(response.body)}.`,
    );
  }

  return actionRequestResponseSchema.parse(response.body);
}

async function approveActionRequest({
  config,
  fetchImpl,
  actionRequestId,
}: {
  config: StripeE2EConfig;
  fetchImpl: typeof fetch;
  actionRequestId: string;
}) {
  const response = await postJson({
    fetchImpl,
    url: `${config.baseUrl}/api/v1/action-requests/${actionRequestId}/approve`,
    body: {
      comment: "Approved by controlled Stripe test-mode E2E demo.",
    },
    headers: {
      "x-refundhold-reviewer-email": config.reviewerEmail,
    },
  });

  if (response.status !== 200) {
    throw new Error(
      `Expected approval to return 200, received ${response.status}: ${safeJson(response.body)}.`,
    );
  }

  return approvalResponseSchema.parse(response.body);
}

async function executeActionRequest({
  config,
  fetchImpl,
  actionRequestId,
}: {
  config: StripeE2EConfig;
  fetchImpl: typeof fetch;
  actionRequestId: string;
}) {
  const response = await postJson({
    fetchImpl,
    url: `${config.baseUrl}/api/v1/action-requests/${actionRequestId}/execute`,
    body: {
      metadata: {
        source: "stripe_test_mode_e2e",
      },
    },
  });

  if (response.status !== 200) {
    throw new Error(
      `Expected Stripe test execution to return 200, received ${response.status}: ${safeJson(response.body)}.`,
    );
  }

  return stripeExecutionResponseSchema.parse(response.body);
}

async function retryExecuteAndAssertIdempotent({
  config,
  fetchImpl,
  actionRequestId,
}: {
  config: StripeE2EConfig;
  fetchImpl: typeof fetch;
  actionRequestId: string;
}) {
  const response = await postJson({
    fetchImpl,
    url: `${config.baseUrl}/api/v1/action-requests/${actionRequestId}/execute`,
    body: {
      metadata: {
        source: "stripe_test_mode_e2e_duplicate",
      },
    },
  });

  assertDuplicateExecuteRejected(response);
}

async function assertStripeRefundPersisted({
  prisma,
  actionRequestId,
  executionId,
  stripeRefundId,
  amountMinor,
  currency,
}: {
  prisma: StripeE2EPrismaClient;
  actionRequestId: string;
  executionId: string;
  stripeRefundId: string;
  amountMinor: number;
  currency: string;
}) {
  const stripeRefund = await prisma.stripeRefund.findUnique({
    where: {
      actionRequestId,
    },
    select: {
      id: true,
      actionRequestId: true,
      executionId: true,
      stripeRefundId: true,
      stripeStatus: true,
      amountMinor: true,
      currency: true,
      idempotencyKeyHash: true,
    },
  });

  if (!stripeRefund) {
    throw new Error("StripeRefund record was not persisted.");
  }

  if (stripeRefund.executionId !== executionId) {
    throw new Error("StripeRefund execution id does not match.");
  }

  if (stripeRefund.stripeRefundId !== stripeRefundId) {
    throw new Error("StripeRefund id does not match Stripe response.");
  }

  if (stripeRefund.amountMinor !== amountMinor) {
    throw new Error("StripeRefund amount does not match request.");
  }

  if (stripeRefund.currency.toLowerCase() !== currency.toLowerCase()) {
    throw new Error("StripeRefund currency does not match request.");
  }

  if (!/^[a-f0-9]{64}$/.test(stripeRefund.idempotencyKeyHash)) {
    throw new Error("StripeRefund idempotency hash is invalid.");
  }

  if (stripeRefund.idempotencyKeyHash.includes(executionId)) {
    throw new Error("StripeRefund idempotency hash must not store raw key data.");
  }

  return stripeRefund;
}

async function checkWebhookReconciliation({
  prisma,
  config,
  stripeRefundId,
}: {
  prisma: StripeE2EPrismaClient;
  config: StripeE2EConfig;
  stripeRefundId: string;
}) {
  const event = await waitForWebhookEvent({
    prisma,
    stripeRefundId,
    waitMs: config.expectWebhook ? config.webhookWaitMs : 0,
  });

  if (!event) {
    if (config.expectWebhook) {
      throw new Error("Expected Stripe webhook reconciliation, but no event was stored.");
    }

    return null;
  }

  if (event.status !== "PROCESSED") {
    throw new Error(
      `Expected Stripe webhook event to be PROCESSED, received ${event.status}.`,
    );
  }

  return event;
}

export async function waitForWebhookEvent({
  prisma,
  stripeRefundId,
  waitMs,
}: {
  prisma: Pick<StripeE2EPrismaClient, "stripeWebhookEvent">;
  stripeRefundId: string;
  waitMs: number;
}) {
  const deadline = Date.now() + waitMs;

  do {
    const event = await prisma.stripeWebhookEvent.findFirst({
      where: {
        objectId: stripeRefundId,
        status: "PROCESSED",
      },
      orderBy: {
        receivedAt: "desc",
      },
      select: {
        id: true,
        type: true,
        status: true,
        objectId: true,
        errorMessage: true,
        processedAt: true,
      },
    });

    if (event) {
      return event;
    }

    if (waitMs <= 0) {
      return null;
    }

    await sleep(1000);
  } while (Date.now() < deadline);

  return null;
}

async function assertUiShowsSafeStripeStatus({
  config,
  fetchImpl,
  actionRequestId,
  stripeRefundId,
}: {
  config: StripeE2EConfig;
  fetchImpl: typeof fetch;
  actionRequestId: string;
  stripeRefundId: string;
}) {
  const headers: Record<string, string> = {};

  if (config.demoAccessEnabled && config.demoAccessPassword) {
    headers.cookie = `${DEMO_ACCESS_COOKIE_NAME}=${await createDemoAccessCookieValue(
      config.demoAccessPassword,
    )}`;
  }

  const response = await fetchImpl(
    `${config.baseUrl}/app/action-requests/${actionRequestId}`,
    {
      headers,
      redirect: "manual",
    },
  );

  if (response.status !== 200) {
    throw new Error(`Expected UI detail page to return 200, received ${response.status}.`);
  }

  const html = await response.text();
  const requiredFragments = [
    "Stripe test object",
    "Stripe test refund execution",
    "Test mode only",
    "No live money movement",
    "Protected by idempotency hash",
    stripeRefundId,
  ];

  for (const fragment of requiredFragments) {
    if (!html.includes(fragment)) {
      throw new Error(`UI detail page is missing expected safe fragment: ${fragment}.`);
    }
  }

  const forbiddenFragments = [
    config.testSecretKey,
    config.webhookTestSecret,
    config.apiKey,
    "REFUNDHOLD_STRIPE_TEST_SECRET_KEY",
    "REFUNDHOLD_STRIPE_WEBHOOK_TEST_SECRET",
    "AUTHRAIL_STRIPE_TEST_SECRET_KEY",
    "AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET",
    "Stripe-Signature",
    "idempotencyKeyHash",
    "refundhold:test:refund",
  ].filter((value): value is string => Boolean(value));

  for (const fragment of forbiddenFragments) {
    if (html.includes(fragment)) {
      throw new Error("UI detail page exposed a sensitive value.");
    }
  }
}

async function postJson({
  fetchImpl,
  url,
  body,
  apiKey,
  headers = {},
}: {
  fetchImpl: typeof fetch;
  url: string;
  body: unknown;
  apiKey?: string;
  headers?: Record<string, string>;
}): Promise<HttpJsonResponse> {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      ...headers,
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const responseBody = await response.json().catch(() => null);

  return {
    status: response.status,
    body: responseBody,
  };
}

function normalizeBaseUrl(value: string, env: StripeE2EEnv): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("BASE_URL must be a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("BASE_URL must use http or https.");
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === "refundhold.com" || hostname === "www.refundhold.com") {
    throw new Error("Production RefundHold URLs are not allowed for this E2E script.");
  }

  const isLocalhost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1";

  if (!isLocalhost && !isEnabledValue(env["REFUNDHOLD_STRIPE_E2E_ALLOW_REMOTE_BASE_URL"])) {
    throw new Error(
      "BASE_URL must be localhost unless REFUNDHOLD_STRIPE_E2E_ALLOW_REMOTE_BASE_URL=true.",
    );
  }

  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

function readRequiredEnv(env: StripeE2EEnv, key: string): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function readRequiredEnvWithLegacy(
  env: StripeE2EEnv,
  preferredName: string,
  legacyName: string,
): string {
  const value = readOptionalEnvWithLegacy(env, preferredName, legacyName);

  if (!value) {
    throw new Error(`${preferredName} is required.`);
  }

  return value;
}

function readPositiveIntegerEnv(
  value: string | undefined,
  fallback: number,
): number {
  const trimmed = value?.trim();

  if (!trimmed) {
    return fallback;
  }

  const parsed = Number(trimmed);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error("Numeric E2E environment values must be positive integers.");
  }

  return parsed;
}

function startsWithAny(value: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => {
    return value.startsWith(prefix);
  });
}

function readExpandableId(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (isRecord(value) && typeof value.id === "string" && value.id.trim().length > 0) {
    return value.id.trim();
  }

  return undefined;
}

function readRequiredString(value: unknown, label: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  throw new Error(`${label} was missing.`);
}

function safeJson(value: unknown): string {
  return redactE2ESecretText(JSON.stringify(value));
}

function logStep(label: string, fields: Record<string, string | null | undefined>) {
  const details = Object.entries(fields)
    .filter(([, value]) => value && value.length > 0)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");

  console.log(details ? `${label}: ${details}` : label);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isMainModule() {
  const entrypoint = process.argv[1];

  return entrypoint
    ? import.meta.url === pathToFileURL(entrypoint).href
    : false;
}

if (isMainModule()) {
  runStripeTestModeE2EDemo().catch((error: unknown) => {
    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);

    console.error(redactE2ESecretText(message));
    process.exit(1);
  });
}
