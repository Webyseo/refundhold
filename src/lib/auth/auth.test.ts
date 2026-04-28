import { describe, expect, it } from "vitest";

import { getBetterAuthOrNull } from "./auth";

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
});
