import { describe, expect, it, vi } from "vitest";

import {
  assertDuplicateExecuteRejected,
  buildStripeRefundActionRequestPayload,
  readStripeTestE2EConfig,
  redactE2ESecretText,
  waitForWebhookEvent,
} from "./stripe-test-e2e";

const testKey = `${"sk"}_${"test"}_unit_fixture`;
const restrictedTestKey = `${"rk"}_${"test"}_unit_fixture`;
const liveKey = `${"sk"}_${"live"}_unit_fixture`;
const webhookSecret = `${"whsec"}_unit_fixture`;

describe("Stripe test-mode E2E script helpers", () => {
  it("fails closed when required env vars are missing", () => {
    expect(() => readStripeTestE2EConfig({})).toThrow(
      "AUTHRAIL_STRIPE_TEST_MODE_ENABLED must be true.",
    );
  });

  it("uses the preferred demo agent API key for Stripe test-mode rehearsals", () => {
    expect(
      readStripeTestE2EConfig({
        REFUNDHOLD_STRIPE_TEST_MODE_ENABLED: "true",
        REFUNDHOLD_STRIPE_TEST_REFUNDS_ENABLED: "true",
        REFUNDHOLD_STRIPE_TEST_SECRET_KEY: testKey,
        REFUNDHOLD_DEMO_AGENT_API_KEY: "ar_demo_prefix_secret",
        BASE_URL: "http://localhost:3000",
        DATABASE_URL: "postgresql://user:password@localhost:5432/refundhold",
      }),
    ).toMatchObject({
      apiKey: "ar_demo_prefix_secret",
      baseUrl: "http://localhost:3000",
      amountMinor: 10000,
      currency: "usd",
      expectWebhook: false,
      reviewerEmail: "demo.reviewer@refundhold.com",
    });
  });

  it("accepts the legacy demo agent API key fallback", () => {
    expect(
      readStripeTestE2EConfig({
        AUTHRAIL_STRIPE_TEST_MODE_ENABLED: "true",
        AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED: "true",
        AUTHRAIL_STRIPE_TEST_SECRET_KEY: testKey,
        AUTHRAIL_DEMO_AGENT_API_KEY: "ar_demo_legacy_secret",
        BASE_URL: "http://localhost:3000",
        DATABASE_URL: "postgresql://user:password@localhost:5432/refundhold",
      }).apiKey,
    ).toBe("ar_demo_legacy_secret");
  });

  it("prefers RefundHold Stripe test-mode settings over legacy settings", () => {
    expect(
      readStripeTestE2EConfig({
        REFUNDHOLD_STRIPE_TEST_MODE_ENABLED: "true",
        REFUNDHOLD_STRIPE_TEST_REFUNDS_ENABLED: "true",
        REFUNDHOLD_STRIPE_TEST_SECRET_KEY: testKey,
        REFUNDHOLD_STRIPE_WEBHOOKS_ENABLED: "true",
        REFUNDHOLD_STRIPE_WEBHOOK_TEST_SECRET: webhookSecret,
        AUTHRAIL_STRIPE_TEST_MODE_ENABLED: "false",
        AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED: "false",
        AUTHRAIL_STRIPE_TEST_SECRET_KEY: restrictedTestKey,
        AUTHRAIL_STRIPE_WEBHOOKS_ENABLED: "false",
        AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET: "whsec_legacy",
        REFUNDHOLD_DEMO_ACCESS_ENABLED: "true",
        REFUNDHOLD_DEMO_ACCESS_PASSWORD: "preferred-password",
        AUTHRAIL_DEMO_ACCESS_ENABLED: "false",
        AUTHRAIL_DEMO_ACCESS_PASSWORD: "legacy-password",
        REFUNDHOLD_DEMO_REVIEWER_EMAIL: "preferred.reviewer@refundhold.com",
        AUTHRAIL_DEMO_REVIEWER_EMAIL: "legacy.reviewer@refundhold.com",
        REFUNDHOLD_DEMO_AGENT_API_KEY: "ar_demo_prefix_secret",
        BASE_URL: "http://localhost:3000",
        DATABASE_URL: "postgresql://user:password@localhost:5432/refundhold",
      }),
    ).toMatchObject({
      testSecretKey: testKey,
      webhookTestSecret: webhookSecret,
      demoAccessEnabled: true,
      demoAccessPassword: "preferred-password",
      reviewerEmail: "preferred.reviewer@refundhold.com",
    });
  });

  it("accepts restricted test keys for controlled test mode", () => {
    expect(
      readStripeTestE2EConfig({
        AUTHRAIL_STRIPE_TEST_MODE_ENABLED: "true",
        AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED: "true",
        AUTHRAIL_STRIPE_TEST_SECRET_KEY: restrictedTestKey,
        AUTHRAIL_DEMO_AGENT_API_KEY: "ar_demo_prefix_secret",
        BASE_URL: "http://127.0.0.1:3000",
        DATABASE_URL: "postgresql://user:password@localhost:5432/refundhold",
      }).testSecretKey,
    ).toBe(restrictedTestKey);
  });

  it("rejects live keys and live refund flags", () => {
    expect(() =>
      readStripeTestE2EConfig({
        REFUNDHOLD_STRIPE_TEST_MODE_ENABLED: "true",
        REFUNDHOLD_STRIPE_TEST_REFUNDS_ENABLED: "true",
        REFUNDHOLD_STRIPE_TEST_SECRET_KEY: liveKey,
        AUTHRAIL_DEMO_AGENT_API_KEY: "ar_demo_prefix_secret",
        BASE_URL: "http://localhost:3000",
        DATABASE_URL: "postgresql://user:password@localhost:5432/refundhold",
      }),
    ).toThrow("Live Stripe keys are not allowed.");

    expect(() =>
      readStripeTestE2EConfig({
        AUTHRAIL_STRIPE_TEST_MODE_ENABLED: "true",
        AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED: "true",
        AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED: "true",
        AUTHRAIL_STRIPE_TEST_SECRET_KEY: testKey,
        AUTHRAIL_DEMO_AGENT_API_KEY: "ar_demo_prefix_secret",
        BASE_URL: "http://localhost:3000",
        DATABASE_URL: "postgresql://user:password@localhost:5432/refundhold",
      }),
    ).toThrow("AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED is blocked.");
  });

  it("blocks the legacy live refund flag even when the RefundHold live flag is disabled", () => {
    expect(() =>
      readStripeTestE2EConfig({
        REFUNDHOLD_STRIPE_TEST_MODE_ENABLED: "true",
        REFUNDHOLD_STRIPE_TEST_REFUNDS_ENABLED: "true",
        REFUNDHOLD_STRIPE_LIVE_REFUNDS_ENABLED: "false",
        REFUNDHOLD_STRIPE_TEST_SECRET_KEY: testKey,
        AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED: "true",
        AUTHRAIL_DEMO_AGENT_API_KEY: "ar_demo_prefix_secret",
        BASE_URL: "http://localhost:3000",
        DATABASE_URL: "postgresql://user:password@localhost:5432/refundhold",
      }),
    ).toThrow("AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED is blocked.");
  });

  it("redacts Stripe keys, webhook secrets, and bearer tokens without keeping prefixes", () => {
    const redacted = redactE2ESecretText(
      `key=${testKey} restricted=${restrictedTestKey} live=${liveKey} webhook=${webhookSecret} bearer=Bearer ar_demo_prefix_secret`,
    );

    expect(redacted).not.toContain(testKey);
    expect(redacted).not.toContain(restrictedTestKey);
    expect(redacted).not.toContain(liveKey);
    expect(redacted).not.toContain(webhookSecret);
    expect(redacted).not.toContain("ar_demo_prefix_secret");
    expect(redacted).not.toContain(`${"sk"}_${"test"}_`);
    expect(redacted).not.toContain(`${"rk"}_${"test"}_`);
    expect(redacted).not.toContain(`${"whsec"}_`);
  });

  it("builds the RefundHold action request payload without secrets", () => {
    const payload = buildStripeRefundActionRequestPayload({
      paymentIntentId: "pi_test_object",
      amountMinor: 10000,
      runId: "run_123",
    });
    const serialized = JSON.stringify(payload);

    expect(payload).toMatchObject({
      connector: "stripe_test",
      action: "refund.create",
      resource: "stripe.payment_intent",
      parameters: {
        payment_intent_id: "pi_test_object",
        amount_minor: 10000,
      },
    });
    expect(serialized).not.toContain("AUTHRAIL_STRIPE_TEST_SECRET_KEY");
    expect(serialized).not.toContain("AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET");
    expect(serialized).not.toContain("Stripe-Signature");
  });

  it("requires duplicate execute retries to be rejected as already executed", () => {
    expect(
      assertDuplicateExecuteRejected({
        status: 409,
        body: {
          error: "already_executed",
          message: "Stripe refund already exists for this action request.",
        },
      }),
    ).toBeUndefined();

    expect(() =>
      assertDuplicateExecuteRejected({
        status: 200,
        body: {
          status: "SUCCEEDED",
        },
      }),
    ).toThrow("Expected duplicate execute to fail with 409.");
  });

  it("waits for a processed webhook event instead of the latest ignored event", async () => {
    const findFirst = vi.fn(async () => {
      return {
        id: "webhook_event_record",
        type: "refund.updated",
        status: "PROCESSED" as const,
        objectId: "re_test",
        errorMessage: null,
        processedAt: new Date("2026-04-28T10:00:00.000Z"),
      };
    });

    const event = await waitForWebhookEvent({
      prisma: {
        stripeWebhookEvent: {
          findFirst,
        },
      },
      stripeRefundId: "re_test",
      waitMs: 0,
    });

    expect(event?.status).toBe("PROCESSED");
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        objectId: "re_test",
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
  });
});
