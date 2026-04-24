import { describe, expect, it } from "vitest";

import {
  createDemoAccessCookieValue,
  getDemoAccessConfig,
  getSafeDemoAccessNextPath,
  isValidDemoAccessCookieValue,
} from "./demo-access";

describe("demo access", () => {
  it("is disabled by default", () => {
    expect(getDemoAccessConfig({})).toEqual({
      enabled: false,
      password: null,
    });
  });

  it("reads enabled demo access config from environment values", () => {
    expect(
      getDemoAccessConfig({
        AUTHRAIL_DEMO_ACCESS_ENABLED: "true",
        AUTHRAIL_DEMO_ACCESS_PASSWORD: "demo-password",
      }),
    ).toEqual({
      enabled: true,
      password: "demo-password",
    });
  });

  it("treats enabled access without a password as configured fail-closed", () => {
    expect(
      getDemoAccessConfig({
        AUTHRAIL_DEMO_ACCESS_ENABLED: "true",
      }),
    ).toEqual({
      enabled: true,
      password: null,
    });
  });

  it("keeps next paths constrained to dashboard routes", () => {
    expect(getSafeDemoAccessNextPath("/app/action-requests?status=pending")).toBe(
      "/app/action-requests?status=pending",
    );
    expect(getSafeDemoAccessNextPath("https://evil.example/app")).toBe("/app");
    expect(getSafeDemoAccessNextPath("/api/health")).toBe("/app");
    expect(getSafeDemoAccessNextPath(null)).toBe("/app");
  });

  it("creates a signed cookie value that verifies with the same password", async () => {
    const cookieValue = await createDemoAccessCookieValue("demo-password");

    await expect(
      isValidDemoAccessCookieValue(cookieValue, "demo-password"),
    ).resolves.toBe(true);
  });

  it("rejects missing, tampered, and wrong-password cookie values", async () => {
    const cookieValue = await createDemoAccessCookieValue("demo-password");

    await expect(
      isValidDemoAccessCookieValue(null, "demo-password"),
    ).resolves.toBe(false);
    await expect(
      isValidDemoAccessCookieValue(`${cookieValue}tampered`, "demo-password"),
    ).resolves.toBe(false);
    await expect(
      isValidDemoAccessCookieValue(cookieValue, "other-password"),
    ).resolves.toBe(false);
  });
});
