import { describe, expect, it } from "vitest";

import robots from "./robots";

describe("robots", () => {
  it("allows public crawling, disallows API routes, and exposes the sitemap", () => {
    const output = robots();
    const rules = Array.isArray(output.rules) ? output.rules[0] : output.rules;

    expect(rules.userAgent).toBe("*");
    expect(rules.disallow).toContain("/api/");
    expect(JSON.stringify(rules.disallow)).not.toContain("/app");
    expect(output.sitemap).toBe("https://refundhold.com/sitemap.xml");
  });
});
