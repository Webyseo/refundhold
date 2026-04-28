import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoginContent, dynamic, getSafeLoginNextPath } from "./page";

describe("login page", () => {
  it("renders dynamically so auth flags are read at request time", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("shows a disabled-safe demo message when auth is disabled", () => {
    const html = renderToStaticMarkup(
      <LoginContent authEnabled={false} nextPath="/app" error={null} />,
    );

    expect(html).toContain("Login is not enabled for this demo.");
    expect(html).toContain("/demo-access");
    expect(html).toContain("Use demo access");
    expect(html).not.toContain("BETTER_AUTH_SECRET");
    expect(html).not.toMatch(/create account/i);
    expect(html).not.toMatch(/sign up/i);
    expect(html).not.toMatch(/type=\"password\"/);
  });

  it("renders only a basic login form when auth is enabled", () => {
    const html = renderToStaticMarkup(
      <LoginContent
        authEnabled={true}
        nextPath="/app/action-requests"
        error={null}
      />,
    );

    expect(html).toContain("Email");
    expect(html).toContain("Password");
    expect(html).toContain("Sign in");
    expect(html).toMatch(/name=\"email\"/);
    expect(html).toMatch(/name=\"password\"/);
    expect(html).toContain("name=\"next\"");
    expect(html).toContain("value=\"/app/action-requests\"");
    expect(html).not.toMatch(/create account/i);
    expect(html).not.toMatch(/sign up/i);
    expect(html).not.toMatch(/social/i);
    expect(html).not.toContain("BETTER_AUTH_SECRET");
  });

  it("sanitizes login next paths to internal app routes only", () => {
    expect(getSafeLoginNextPath("/app/action-requests")).toBe(
      "/app/action-requests",
    );
    expect(getSafeLoginNextPath("/app/action-requests?status=pending")).toBe(
      "/app/action-requests?status=pending",
    );
    expect(getSafeLoginNextPath("https://refundhold.com/app")).toBe("/app");
    expect(getSafeLoginNextPath("//evil.example/app")).toBe("/app");
    expect(getSafeLoginNextPath("/api/health")).toBe("/app");
    expect(getSafeLoginNextPath(null)).toBe("/app");
  });

  it("shows a generic login error without revealing whether the email exists", () => {
    const html = renderToStaticMarkup(
      <LoginContent authEnabled={true} nextPath="/app" error="invalid" />,
    );

    expect(html).toContain("Invalid email or password.");
    expect(html).not.toMatch(/email.*not.*found/i);
    expect(html).not.toMatch(/user.*not.*found/i);
  });
});
