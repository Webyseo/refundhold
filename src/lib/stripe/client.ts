import { env as processEnv } from "node:process";

import Stripe from "stripe";

import {
  getStripeSafetyConfig,
  type StripeSafetyEnv,
} from "./config";

export class StripeTestClientConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeTestClientConfigError";
  }
}

export function getStripeTestClient(
  env: StripeSafetyEnv = processEnv,
): Stripe {
  const config = getStripeSafetyConfig(env);

  if (!config.testModeEnabled) {
    throw new StripeTestClientConfigError(
      "AUTHRAIL_STRIPE_TEST_MODE_ENABLED is disabled; Stripe test client is unavailable.",
    );
  }

  if (!config.testSecretKey) {
    throw new StripeTestClientConfigError(
      "AUTHRAIL_STRIPE_TEST_SECRET_KEY is required to create the Stripe test client.",
    );
  }

  return new Stripe(config.testSecretKey, {
    appInfo: {
      name: "RefundHold",
    },
  });
}

export const getStripeTestClientOrThrow = getStripeTestClient;
