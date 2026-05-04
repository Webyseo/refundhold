import { describe, expect, it } from "vitest";

import sitemap from "./sitemap";

describe("sitemap", () => {
  it("includes public indexable pages and excludes private, API, and gate routes", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        "https://refundhold.com/",
        "https://refundhold.com/demo",
        "https://refundhold.com/demo/reviewer",
        "https://refundhold.com/docs",
        "https://refundhold.com/docs/quickstart",
        "https://refundhold.com/docs/api",
        "https://refundhold.com/docs/stripe-test-mode",
        "https://refundhold.com/security",
        "https://refundhold.com/contact",
        "https://refundhold.com/privacy",
        "https://refundhold.com/terms",
      ]),
    );

    const paths = urls.map((url) => new URL(url).pathname);

    expect(paths.some((path) => path.startsWith("/app"))).toBe(false);
    expect(paths.some((path) => path.startsWith("/api"))).toBe(false);
    expect(paths.some((path) => path.startsWith("/demo-access"))).toBe(false);
    expect(paths.some((path) => path.startsWith("/docs/internal"))).toBe(false);
  });
});
