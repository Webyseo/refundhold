import { describe, expect, it } from "vitest";

import { getAuthConfig, redactAuthSecret } from "./config";

describe("getAuthConfig", () => {
  it("returns disabled defaults without requiring a Better Auth secret", () => {
    expect(getAuthConfig({})).toEqual({
      authEnabled: false,
      authRequired: false,
      betterAuthSecret: null,
      betterAuthUrl: null,
    });
  });

  it("fails closed when auth is required but not enabled", () => {
    expect(() => {
      getAuthConfig({
        REFUNDHOLD_AUTH_REQUIRED: "true",
      });
    }).toThrow("AUTHRAIL_AUTH_REQUIRED requires AUTHRAIL_AUTH_ENABLED.");
  });

  it("fails closed when auth is enabled without a Better Auth secret", () => {
    expect(() => {
      getAuthConfig({
        REFUNDHOLD_AUTH_ENABLED: "true",
      });
    }).toThrow(
      "BETTER_AUTH_SECRET is required when AUTHRAIL_AUTH_ENABLED is enabled.",
    );
  });

  it("accepts an explicit disabled auth mode even when no secret is configured", () => {
    expect(
      getAuthConfig({
        REFUNDHOLD_AUTH_ENABLED: "false",
        REFUNDHOLD_AUTH_REQUIRED: "false",
      }),
    ).toMatchObject({
      authEnabled: false,
      authRequired: false,
      betterAuthSecret: null,
    });
  });

  it("returns server-side Better Auth settings when auth is enabled", () => {
    const config = getAuthConfig({
      REFUNDHOLD_AUTH_ENABLED: "true",
      REFUNDHOLD_AUTH_REQUIRED: "true",
      BETTER_AUTH_SECRET: "local-development-secret",
      BETTER_AUTH_URL: "http://localhost:3000",
    });

    expect(config).toEqual({
      authEnabled: true,
      authRequired: true,
      betterAuthSecret: "local-development-secret",
      betterAuthUrl: "http://localhost:3000",
    });
  });

  it("falls back to legacy auth environment values", () => {
    expect(
      getAuthConfig({
        AUTHRAIL_AUTH_ENABLED: "true",
        AUTHRAIL_AUTH_REQUIRED: "true",
        BETTER_AUTH_SECRET: "legacy-secret",
      }),
    ).toMatchObject({
      authEnabled: true,
      authRequired: true,
      betterAuthSecret: "legacy-secret",
    });
  });

  it("prefers RefundHold auth values over legacy values", () => {
    expect(
      getAuthConfig({
        REFUNDHOLD_AUTH_ENABLED: "false",
        REFUNDHOLD_AUTH_REQUIRED: "false",
        AUTHRAIL_AUTH_ENABLED: "true",
        AUTHRAIL_AUTH_REQUIRED: "true",
        BETTER_AUTH_SECRET: "legacy-secret",
      }),
    ).toMatchObject({
      authEnabled: false,
      authRequired: false,
      betterAuthSecret: "legacy-secret",
    });
  });

  it("does not expose the full Better Auth secret in safe labels", () => {
    const secret = "local-development-secret";

    expect(redactAuthSecret(secret)).toBe("configured");
    expect(redactAuthSecret(secret)).not.toContain(secret);
    expect(redactAuthSecret("")).toBe("empty");
  });
});
