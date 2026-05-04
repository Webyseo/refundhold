import { describe, expect, it } from "vitest";

import {
  getStripeSafetyConfig,
  redactSecret,
  safeKeyPrefix,
} from "./config";

describe("getStripeSafetyConfig", () => {
  it("returns safe defaults when Stripe env is empty", () => {
    const config = getStripeSafetyConfig({});

    expect(config).toEqual({
      testModeEnabled: false,
      testRefundsEnabled: false,
      webhooksEnabled: false,
      testSecretKey: null,
      webhookTestSecret: null,
      liveRefundsEnabled: false,
    });
  });

  it("fails closed when test mode is enabled without a test key", () => {
    expect(() => {
      getStripeSafetyConfig({
        REFUNDHOLD_STRIPE_TEST_MODE_ENABLED: "true",
      });
    }).toThrow(
      "AUTHRAIL_STRIPE_TEST_SECRET_KEY is required when AUTHRAIL_STRIPE_TEST_MODE_ENABLED is enabled.",
    );
  });

  it("fails closed when test refunds are enabled without test mode", () => {
    expect(() => {
      getStripeSafetyConfig({
        REFUNDHOLD_STRIPE_TEST_REFUNDS_ENABLED: "true",
        REFUNDHOLD_STRIPE_TEST_SECRET_KEY: "sk_test_123",
      });
    }).toThrow(
      "AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED requires AUTHRAIL_STRIPE_TEST_MODE_ENABLED.",
    );
  });

  it("fails closed when test refunds are enabled without a test key", () => {
    expect(() => {
      getStripeSafetyConfig({
        REFUNDHOLD_STRIPE_TEST_MODE_ENABLED: "true",
        REFUNDHOLD_STRIPE_TEST_REFUNDS_ENABLED: "true",
      });
    }).toThrow(
      "AUTHRAIL_STRIPE_TEST_SECRET_KEY is required when AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED is enabled.",
    );
  });

  it("accepts sk_test secret keys", () => {
    const config = getStripeSafetyConfig({
      REFUNDHOLD_STRIPE_TEST_MODE_ENABLED: "true",
      REFUNDHOLD_STRIPE_TEST_SECRET_KEY: "sk_test_123",
    });

    expect(config.testSecretKey).toBe("sk_test_123");
  });

  it("accepts rk_test restricted keys", () => {
    const config = getStripeSafetyConfig({
      REFUNDHOLD_STRIPE_TEST_MODE_ENABLED: "true",
      REFUNDHOLD_STRIPE_TEST_SECRET_KEY: "rk_test_123",
    });

    expect(config.testSecretKey).toBe("rk_test_123");
  });

  it("rejects sk_live keys", () => {
    expect(() => {
      getStripeSafetyConfig({
        REFUNDHOLD_STRIPE_TEST_SECRET_KEY: "sk_live_secret_value",
      });
    }).toThrow(
      "AUTHRAIL_STRIPE_TEST_SECRET_KEY must not use live Stripe key prefixes in v1.",
    );
  });

  it("rejects rk_live keys", () => {
    expect(() => {
      getStripeSafetyConfig({
        REFUNDHOLD_STRIPE_TEST_SECRET_KEY: "rk_live_secret_value",
      });
    }).toThrow(
      "AUTHRAIL_STRIPE_TEST_SECRET_KEY must not use live Stripe key prefixes in v1.",
    );
  });

  it("rejects invalid key prefixes", () => {
    expect(() => {
      getStripeSafetyConfig({
        REFUNDHOLD_STRIPE_TEST_SECRET_KEY: "not_a_stripe_key",
      });
    }).toThrow(
      "AUTHRAIL_STRIPE_TEST_SECRET_KEY must use a Stripe test-mode secret or restricted key prefix.",
    );
  });

  it("fails closed when live refunds are enabled", () => {
    expect(() => {
      getStripeSafetyConfig({
        REFUNDHOLD_STRIPE_LIVE_REFUNDS_ENABLED: "true",
      });
    }).toThrow(
      "AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED is intentionally blocked in v1.",
    );
  });

  it("still fails closed when legacy live refunds are enabled", () => {
    expect(() => {
      getStripeSafetyConfig({
        AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED: "true",
      });
    }).toThrow(
      "AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED is intentionally blocked in v1.",
    );
  });

  it("fails closed when the legacy live-refunds flag is enabled even if the RefundHold flag is disabled", () => {
    expect(() => {
      getStripeSafetyConfig({
        REFUNDHOLD_STRIPE_LIVE_REFUNDS_ENABLED: "false",
        AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED: "true",
      });
    }).toThrow(
      "AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED is intentionally blocked in v1.",
    );
  });

  it("fails closed when webhooks are enabled without a signing secret", () => {
    expect(() => {
      getStripeSafetyConfig({
        REFUNDHOLD_STRIPE_WEBHOOKS_ENABLED: "true",
      });
    }).toThrow(
      "AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET is required when AUTHRAIL_STRIPE_WEBHOOKS_ENABLED is enabled.",
    );
  });

  it("falls back to legacy Stripe test-mode values", () => {
    const config = getStripeSafetyConfig({
      AUTHRAIL_STRIPE_TEST_MODE_ENABLED: "true",
      AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED: "true",
      AUTHRAIL_STRIPE_WEBHOOKS_ENABLED: "true",
      AUTHRAIL_STRIPE_TEST_SECRET_KEY: "sk_test_legacy",
      AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET: "whsec_legacy",
    });

    expect(config).toMatchObject({
      testModeEnabled: true,
      testRefundsEnabled: true,
      webhooksEnabled: true,
      testSecretKey: "sk_test_legacy",
      webhookTestSecret: "whsec_legacy",
    });
  });

  it("prefers RefundHold Stripe values over legacy values", () => {
    const config = getStripeSafetyConfig({
      REFUNDHOLD_STRIPE_TEST_MODE_ENABLED: "true",
      REFUNDHOLD_STRIPE_TEST_REFUNDS_ENABLED: "false",
      REFUNDHOLD_STRIPE_WEBHOOKS_ENABLED: "true",
      REFUNDHOLD_STRIPE_TEST_SECRET_KEY: "sk_test_preferred",
      REFUNDHOLD_STRIPE_WEBHOOK_TEST_SECRET: "whsec_preferred",
      AUTHRAIL_STRIPE_TEST_MODE_ENABLED: "false",
      AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED: "true",
      AUTHRAIL_STRIPE_WEBHOOKS_ENABLED: "false",
      AUTHRAIL_STRIPE_TEST_SECRET_KEY: "sk_test_legacy",
      AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET: "whsec_legacy",
    });

    expect(config).toMatchObject({
      testModeEnabled: true,
      testRefundsEnabled: false,
      webhooksEnabled: true,
      testSecretKey: "sk_test_preferred",
      webhookTestSecret: "whsec_preferred",
    });
  });
});

describe("Stripe secret redaction", () => {
  it("does not reveal the full key", () => {
    const key = "sk_test_full_secret_value";

    expect(redactSecret(key)).toBe("sk_test_***");
    expect(redactSecret(key)).not.toContain("full_secret_value");
  });

  it("summarizes empty and invalid values safely", () => {
    expect(redactSecret("")).toBe("empty");
    expect(safeKeyPrefix("not_a_stripe_key")).toBe("invalid_prefix");
  });

  it("summarizes supported key prefixes safely", () => {
    expect(safeKeyPrefix("sk_test_123")).toBe("sk_test_***");
    expect(safeKeyPrefix("rk_test_123")).toBe("rk_test_***");
    expect(safeKeyPrefix("sk_live_123")).toBe("sk_live_***");
    expect(safeKeyPrefix("rk_live_123")).toBe("rk_live_***");
  });
});
