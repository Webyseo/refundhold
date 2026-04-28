import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  authIdentityModelNames,
  emailPasswordAuthEnabled,
  getBetterAuthOrNull,
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

  it("keeps email/password auth disabled until a login route is intentionally added", () => {
    expect(emailPasswordAuthEnabled).toBe(false);
  });

  it("does not expose Better Auth or login routes yet", () => {
    expect(existsSync(join(process.cwd(), "src", "app", "api", "auth"))).toBe(
      false,
    );
    expect(existsSync(join(process.cwd(), "src", "app", "login"))).toBe(false);
  });
});
