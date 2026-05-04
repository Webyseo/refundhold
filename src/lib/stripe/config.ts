import {
  isEnabledValue,
  readEnabledEnvWithLegacy,
  readOptionalEnvWithLegacy,
} from "../env";

export type StripeSafetyEnv = {
  [key: string]: string | undefined;
  REFUNDHOLD_STRIPE_TEST_MODE_ENABLED?: string;
  REFUNDHOLD_STRIPE_TEST_REFUNDS_ENABLED?: string;
  REFUNDHOLD_STRIPE_WEBHOOKS_ENABLED?: string;
  REFUNDHOLD_STRIPE_TEST_SECRET_KEY?: string;
  REFUNDHOLD_STRIPE_WEBHOOK_TEST_SECRET?: string;
  REFUNDHOLD_STRIPE_LIVE_REFUNDS_ENABLED?: string;
  AUTHRAIL_STRIPE_TEST_MODE_ENABLED?: string;
  AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED?: string;
  AUTHRAIL_STRIPE_WEBHOOKS_ENABLED?: string;
  AUTHRAIL_STRIPE_TEST_SECRET_KEY?: string;
  AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET?: string;
  AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED?: string;
};

export type StripeSafetyConfig = {
  testModeEnabled: boolean;
  testRefundsEnabled: boolean;
  webhooksEnabled: boolean;
  testSecretKey: string | null;
  webhookTestSecret: string | null;
  liveRefundsEnabled: boolean;
};

const testSecretPrefixes = ["sk_test_", "rk_test_"] as const;
const liveSecretPrefixes = ["sk_live_", "rk_live_"] as const;
const redactedPrefixes = [
  ...testSecretPrefixes,
  ...liveSecretPrefixes,
  "whsec_",
] as const;

export class StripeSafetyConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeSafetyConfigError";
  }
}

export function getStripeSafetyConfig(
  env: StripeSafetyEnv = process.env,
): StripeSafetyConfig {
  const testModeEnabled = readEnabledEnvWithLegacy(
    env,
    "REFUNDHOLD_STRIPE_TEST_MODE_ENABLED",
    "AUTHRAIL_STRIPE_TEST_MODE_ENABLED",
  );
  const testRefundsEnabled = readEnabledEnvWithLegacy(
    env,
    "REFUNDHOLD_STRIPE_TEST_REFUNDS_ENABLED",
    "AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED",
  );
  const webhooksEnabled = readEnabledEnvWithLegacy(
    env,
    "REFUNDHOLD_STRIPE_WEBHOOKS_ENABLED",
    "AUTHRAIL_STRIPE_WEBHOOKS_ENABLED",
  );
  const liveRefundsEnabled =
    isEnabledValue(env.REFUNDHOLD_STRIPE_LIVE_REFUNDS_ENABLED) ||
    isEnabledValue(env.AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED);
  const testSecretKey = readOptionalEnvWithLegacy(
    env,
    "REFUNDHOLD_STRIPE_TEST_SECRET_KEY",
    "AUTHRAIL_STRIPE_TEST_SECRET_KEY",
  );
  const webhookTestSecret = readOptionalEnvWithLegacy(
    env,
    "REFUNDHOLD_STRIPE_WEBHOOK_TEST_SECRET",
    "AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET",
  );

  if (liveRefundsEnabled) {
    throw new StripeSafetyConfigError(
      "AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED is intentionally blocked in v1.",
    );
  }

  validateTestSecretKey(testSecretKey);

  if (testRefundsEnabled && !testModeEnabled) {
    throw new StripeSafetyConfigError(
      "AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED requires AUTHRAIL_STRIPE_TEST_MODE_ENABLED.",
    );
  }

  if (testRefundsEnabled && !testSecretKey) {
    throw new StripeSafetyConfigError(
      "AUTHRAIL_STRIPE_TEST_SECRET_KEY is required when AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED is enabled.",
    );
  }

  if (testModeEnabled && !testSecretKey) {
    throw new StripeSafetyConfigError(
      "AUTHRAIL_STRIPE_TEST_SECRET_KEY is required when AUTHRAIL_STRIPE_TEST_MODE_ENABLED is enabled.",
    );
  }

  if (webhooksEnabled && !webhookTestSecret) {
    throw new StripeSafetyConfigError(
      "AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET is required when AUTHRAIL_STRIPE_WEBHOOKS_ENABLED is enabled.",
    );
  }

  return {
    testModeEnabled,
    testRefundsEnabled,
    webhooksEnabled,
    testSecretKey,
    webhookTestSecret,
    liveRefundsEnabled,
  };
}

export function redactSecret(value: string | null | undefined): string {
  const secret = value?.trim();

  if (!secret) {
    return "empty";
  }

  const prefix = redactedPrefixes.find((candidate) => {
    return secret.startsWith(candidate);
  });

  return prefix ? `${prefix}***` : "invalid_prefix";
}

export function safeKeyPrefix(value: string | null | undefined): string {
  return redactSecret(value);
}

function validateTestSecretKey(testSecretKey: string | null) {
  if (!testSecretKey) {
    return;
  }

  if (startsWithAny(testSecretKey, liveSecretPrefixes)) {
    throw new StripeSafetyConfigError(
      `AUTHRAIL_STRIPE_TEST_SECRET_KEY must not use live Stripe key prefixes in v1. Received ${safeKeyPrefix(testSecretKey)}.`,
    );
  }

  if (!startsWithAny(testSecretKey, testSecretPrefixes)) {
    throw new StripeSafetyConfigError(
      `AUTHRAIL_STRIPE_TEST_SECRET_KEY must use a Stripe test-mode secret or restricted key prefix. Received ${safeKeyPrefix(testSecretKey)}.`,
    );
  }
}

function startsWithAny(
  value: string,
  prefixes: readonly string[],
): boolean {
  return prefixes.some((prefix) => {
    return value.startsWith(prefix);
  });
}
