import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import proxy from "./proxy";

describe("app proxy access gates", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the demo gate active when auth is not required", async () => {
    vi.stubEnv("AUTHRAIL_AUTH_ENABLED", "false");
    vi.stubEnv("AUTHRAIL_AUTH_REQUIRED", "false");
    vi.stubEnv("AUTHRAIL_DEMO_ACCESS_ENABLED", "true");
    vi.stubEnv("AUTHRAIL_DEMO_ACCESS_PASSWORD", "demo-password");

    const response = await proxy(createRequest("/app/action-requests"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/demo-access?next=%2Fapp%2Faction-requests",
    );
  });

  it("lets server components enforce Better Auth when auth is required", async () => {
    vi.stubEnv("AUTHRAIL_AUTH_ENABLED", "true");
    vi.stubEnv("AUTHRAIL_AUTH_REQUIRED", "true");
    vi.stubEnv("BETTER_AUTH_SECRET", "local-test-secret");
    vi.stubEnv("AUTHRAIL_DEMO_ACCESS_ENABLED", "true");
    vi.stubEnv("AUTHRAIL_DEMO_ACCESS_PASSWORD", "demo-password");

    const response = await proxy(createRequest("/app/action-requests"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("fails closed when auth-required configuration is invalid", async () => {
    vi.stubEnv("AUTHRAIL_AUTH_ENABLED", "false");
    vi.stubEnv("AUTHRAIL_AUTH_REQUIRED", "true");

    const response = await proxy(createRequest("/app"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: "failed_closed",
      message: "Authentication configuration is invalid.",
    });
  });
});

function createRequest(pathname: string): NextRequest {
  return new NextRequest(`http://localhost:3000${pathname}`);
}
