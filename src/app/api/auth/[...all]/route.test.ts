import { describe, expect, it, vi } from "vitest";

import { handleAuthRouteRequest, runtime, type AuthRouteAuth } from "./route";

describe("Better Auth route handler", () => {
  it("uses the Node.js runtime for Better Auth and Prisma", () => {
    expect(runtime).toBe("nodejs");
  });

  it("does not operate when auth is disabled and does not require a secret", async () => {
    const getAuth = vi.fn<() => Promise<AuthRouteAuth | null>>();

    const response = await handleAuthRouteRequest(createRequest(), {
      env: {
        AUTHRAIL_AUTH_ENABLED: "false",
      },
      getAuth,
    });

    await expect(response.json()).resolves.toEqual({
      error: "auth_disabled",
      message: "Authentication is not enabled.",
    });
    expect(response.status).toBe(404);
    expect(getAuth).not.toHaveBeenCalled();
  });

  it("fails closed for invalid auth config without exposing the secret", async () => {
    const secret = "local-test-secret-value";

    const response = await handleAuthRouteRequest(createRequest(), {
      env: {
        AUTHRAIL_AUTH_ENABLED: "true",
        AUTHRAIL_AUTH_REQUIRED: "true",
        BETTER_AUTH_SECRET: secret,
      },
      getAuth: async () => {
        throw new Error(`adapter failed with ${secret}`);
      },
    });

    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).toContain("Authentication is not available.");
    expect(body).not.toContain(secret);
  });

  it("routes requests to Better Auth only when auth is enabled", async () => {
    const authResponse = Response.json({ ok: true }, { status: 201 });
    const handler = vi.fn<AuthRouteAuth["handler"]>(() => authResponse);
    const getAuth = vi.fn(async () => ({ handler }));
    const request = createRequest();

    const response = await handleAuthRouteRequest(request, {
      env: {
        AUTHRAIL_AUTH_ENABLED: "true",
        BETTER_AUTH_SECRET: "local-test-secret-value",
      },
      getAuth,
    });

    expect(response).toBe(authResponse);
    expect(getAuth).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(request);
  });

  it("does not reveal BETTER_AUTH_SECRET when auth is enabled without a secret", async () => {
    const response = await handleAuthRouteRequest(createRequest(), {
      env: {
        AUTHRAIL_AUTH_ENABLED: "true",
      },
      getAuth: vi.fn(),
    });

    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).toContain("Authentication is not available.");
    expect(body).not.toContain("BETTER_AUTH_SECRET");
  });
});

function createRequest(): Request {
  return new Request("http://localhost:3000/api/auth/sign-in/email", {
    method: "POST",
  });
}
