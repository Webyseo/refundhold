import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoginContent, dynamic } from "./page";

describe("login page", () => {
  it("renders dynamically so auth flags are read at request time", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("shows a disabled-safe demo message when auth is disabled", () => {
    const html = renderToStaticMarkup(<LoginContent authEnabled={false} />);

    expect(html).toContain("Login is not enabled for this demo.");
    expect(html).toContain("/demo-access");
    expect(html).toContain("Use demo access");
    expect(html).not.toContain("BETTER_AUTH_SECRET");
    expect(html).not.toMatch(/create account/i);
    expect(html).not.toMatch(/sign up/i);
    expect(html).not.toMatch(/type=\"password\"/);
  });

  it("renders only a basic login form when auth is enabled", () => {
    const html = renderToStaticMarkup(<LoginContent authEnabled={true} />);

    expect(html).toContain("Email");
    expect(html).toContain("Password");
    expect(html).toContain("Sign in");
    expect(html).toMatch(/name=\"email\"/);
    expect(html).toMatch(/name=\"password\"/);
    expect(html).not.toMatch(/create account/i);
    expect(html).not.toMatch(/sign up/i);
    expect(html).not.toMatch(/social/i);
    expect(html).not.toContain("BETTER_AUTH_SECRET");
  });
});
