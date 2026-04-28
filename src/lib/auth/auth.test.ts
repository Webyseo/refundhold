import { describe, expect, it } from "vitest";
import {
  authIdentityModelNames,
  emailPasswordAuthEnabled,
  getBetterAuthOrNull,
  oauthProvidersConfigured,
  publicSignupEnabled,
} from "./auth";

describe("Better Auth scaffold", () => {
  it("does not initialize Better Auth while auth is disabled", async () => {
    await expect(getBetterAuthOrNull({})).resolves.toBeNull();
  });

  it("fails closed through config validation before creating an auth instance", async () => {
    await expect(
      getBetterAuthOrNull({
        AUTHRAIL_AUTH_ENABLED: "true",
      }),
    ).rejects.toThrow(
      "BETTER_AUTH_SECRET is required when AUTHRAIL_AUTH_ENABLED is enabled.",
    );
  });

  it("maps Better Auth core tables to the Auth* identity models", () => {
    expect(authIdentityModelNames).toEqual({
      user: "authUser",
      session: "authSession",
      account: "authAccount",
      verification: "authVerification",
    });
  });

  it("prepares email/password auth while keeping public signup disabled", () => {
    expect(emailPasswordAuthEnabled).toBe(true);
    expect(publicSignupEnabled).toBe(false);
  });

  it("does not configure OAuth providers", () => {
    expect(oauthProvidersConfigured).toBe(false);
  });
});
