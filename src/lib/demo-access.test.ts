import { describe, expect, it } from "vitest";

import {
  createDemoAccessCookieValue,
  getDemoAccessConfig,
  getDemoAccessStatus,
  getSafeDemoAccessNextPath,
  isDemoAccessPasswordValid,
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
        REFUNDHOLD_DEMO_ACCESS_ENABLED: "true",
        REFUNDHOLD_DEMO_ACCESS_PASSWORD: "demo-password",
      }),
    ).toEqual({
      enabled: true,
      password: "demo-password",
    });
  });

  it("falls back to legacy demo access environment values", () => {
    expect(
      getDemoAccessConfig({
        AUTHRAIL_DEMO_ACCESS_ENABLED: "true",
        AUTHRAIL_DEMO_ACCESS_PASSWORD: "legacy-password",
      }),
    ).toEqual({
      enabled: true,
      password: "legacy-password",
    });
  });

  it("prefers RefundHold demo access values over legacy values", () => {
    expect(
      getDemoAccessConfig({
        REFUNDHOLD_DEMO_ACCESS_ENABLED: "false",
        REFUNDHOLD_DEMO_ACCESS_PASSWORD: "preferred-password",
        AUTHRAIL_DEMO_ACCESS_ENABLED: "true",
        AUTHRAIL_DEMO_ACCESS_PASSWORD: "legacy-password",
      }),
    ).toEqual({
      enabled: false,
      password: "preferred-password",
    });
  });

  it("exposes only safe demo access render status", () => {
    expect(
      getDemoAccessStatus({
        REFUNDHOLD_DEMO_ACCESS_ENABLED: "true",
        REFUNDHOLD_DEMO_ACCESS_PASSWORD: "demo-password",
      }),
    ).toEqual({
      enabled: true,
      hasPassword: true,
    });
  });

  it("treats enabled access without a password as configured fail-closed", () => {
    expect(
      getDemoAccessConfig({
        REFUNDHOLD_DEMO_ACCESS_ENABLED: "true",
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
    expect(getSafeDemoAccessNextPath("//evil.example/app")).toBe("/app");
    expect(getSafeDemoAccessNextPath("/api/health")).toBe("/app");
    expect(getSafeDemoAccessNextPath("/application")).toBe("/app");
    expect(getSafeDemoAccessNextPath(null)).toBe("/app");
  });

  it("creates a signed cookie value that verifies with the same password", async () => {
    const now = new Date("2026-04-27T10:00:00.000Z");
    const cookieValue = await createDemoAccessCookieValue("demo-password", now);

    await expect(
      isValidDemoAccessCookieValue(cookieValue, "demo-password", now),
    ).resolves.toBe(true);
  });

  it("rejects missing, tampered, and wrong-password cookie values", async () => {
    const now = new Date("2026-04-27T10:00:00.000Z");
    const cookieValue = await createDemoAccessCookieValue("demo-password", now);

    await expect(
      isValidDemoAccessCookieValue(null, "demo-password", now),
    ).resolves.toBe(false);
    await expect(
      isValidDemoAccessCookieValue(
        `${cookieValue}tampered`,
        "demo-password",
        now,
      ),
    ).resolves.toBe(false);
    await expect(
      isValidDemoAccessCookieValue(cookieValue, "other-password", now),
    ).resolves.toBe(false);
  });

  it("rejects expired and overlong cookie sessions", async () => {
    const now = new Date("2026-04-27T10:00:00.000Z");
    const cookieValue = await createDemoAccessCookieValue("demo-password", now);

    await expect(
      isValidDemoAccessCookieValue(
        cookieValue,
        "demo-password",
        new Date("2026-04-27T18:00:00.001Z"),
      ),
    ).resolves.toBe(false);

    await expect(
      isValidDemoAccessCookieValue(
        cookieValue,
        "demo-password",
        new Date("2026-04-27T09:59:59.999Z"),
      ),
    ).resolves.toBe(false);
  });

  it("validates submitted passwords with fixed-length HMAC comparison", async () => {
    await expect(
      isDemoAccessPasswordValid("demo-password", "demo-password"),
    ).resolves.toBe(true);
    await expect(
      isDemoAccessPasswordValid("wrong-password", "demo-password"),
    ).resolves.toBe(false);
    await expect(
      isDemoAccessPasswordValid(null, "demo-password"),
    ).resolves.toBe(false);
  });
});
