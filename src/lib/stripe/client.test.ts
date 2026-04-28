import { readFileSync } from "node:fs";

import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { getStripeTestClient } from "./client";

describe("getStripeTestClient", () => {
  it("does not create a client when Stripe test mode is disabled", () => {
    expect(() => {
      getStripeTestClient({});
    }).toThrow(
      "AUTHRAIL_STRIPE_TEST_MODE_ENABLED is disabled; Stripe test client is unavailable.",
    );
  });

  it("creates a client when test mode is enabled with an sk_test key", () => {
    const client = getStripeTestClient({
      AUTHRAIL_STRIPE_TEST_MODE_ENABLED: "true",
      AUTHRAIL_STRIPE_TEST_SECRET_KEY: "sk_test_unit_fixture",
    });

    expect(client).toBeInstanceOf(Stripe);
  });

  it("creates a client when test mode is enabled with an rk_test key", () => {
    const client = getStripeTestClient({
      AUTHRAIL_STRIPE_TEST_MODE_ENABLED: "true",
      AUTHRAIL_STRIPE_TEST_SECRET_KEY: "rk_test_unit_fixture",
    });

    expect(client).toBeInstanceOf(Stripe);
  });

  it("rejects live keys through the safety config", () => {
    expect(() => {
      getStripeTestClient({
        AUTHRAIL_STRIPE_TEST_MODE_ENABLED: "true",
        AUTHRAIL_STRIPE_TEST_SECRET_KEY: "sk_live_unit_fixture",
      });
    }).toThrow(
      "AUTHRAIL_STRIPE_TEST_SECRET_KEY must not use live Stripe key prefixes in v1.",
    );
  });

  it("does not reveal the full key in errors", () => {
    const fullKey = "sk_live_unit_fixture";

    expect(() => {
      getStripeTestClient({
        AUTHRAIL_STRIPE_TEST_MODE_ENABLED: "true",
        AUTHRAIL_STRIPE_TEST_SECRET_KEY: fullKey,
      });
    }).toThrow("sk_live_***");

    try {
      getStripeTestClient({
        AUTHRAIL_STRIPE_TEST_MODE_ENABLED: "true",
        AUTHRAIL_STRIPE_TEST_SECRET_KEY: fullKey,
      });
    } catch (error) {
      expect(String(error)).not.toContain("unit_fixture");
    }
  });

  it("does not depend on client component or DOM runtime markers", () => {
    const source = readFileSync(new URL("./client.ts", import.meta.url), "utf8");

    expect(source).not.toContain("\"use client\"");
    expect(source).not.toContain("'use client'");
    expect(source).not.toMatch(/\bwindow\b|\bdocument\b|\blocalStorage\b/);
  });
});
