import { describe, expect, it } from "vitest";

import {
  DEFAULT_METADATA_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  PRIVATE_NOINDEX_ROUTES,
  PUBLIC_INDEXABLE_PAGES,
  SITE_NAME,
  SITE_URL,
  createNoindexMetadata,
  createPageMetadata,
  publicRobots,
} from "./seo";

const requiredPublicPaths = [
  "/",
  "/demo",
  "/demo/reviewer",
  "/docs",
  "/docs/quickstart",
  "/docs/api",
  "/docs/stripe-test-mode",
  "/security",
  "/contact",
  "/privacy",
  "/terms",
];

const forbiddenPublicSeoTerms = [
  "AuthRail",
  "AUTHRAIL_",
  "ActionRequest",
  "AuthRailDecision",
  "dry_run",
  "connector",
];

describe("SEO configuration", () => {
  it("exports the default RefundHold site metadata primitives", () => {
    expect(SITE_NAME).toBe("RefundHold");
    expect(SITE_URL).toBe("https://refundhold.com");
    expect(DEFAULT_OG_IMAGE).toBe("https://refundhold.com/opengraph-image");
    expect(DEFAULT_METADATA_DESCRIPTION).toBe(
      "Stop AI agents from refunding Stripe money without approval. RefundHold checks AI-proposed Stripe refunds, holds risky ones for review, and records every decision.",
    );
  });

  it("defines every public indexable page with title, description, canonical path, and index/follow robots", () => {
    const paths = PUBLIC_INDEXABLE_PAGES.map((page) => page.path);

    expect(paths).toEqual(expect.arrayContaining(requiredPublicPaths));

    for (const page of PUBLIC_INDEXABLE_PAGES) {
      expect(page.title).toBeTruthy();
      expect(page.description).toBeTruthy();
      expect(page.path).toMatch(/^\/($|[a-z0-9-/]+$)/);

      const metadata = createPageMetadata(page);
      expect(metadata.alternates?.canonical).toBe(
        new URL(page.path, SITE_URL).toString(),
      );
      expect(metadata.robots).toEqual(publicRobots);
    }
  });

  it("marks private route patterns as noindex and nofollow", () => {
    expect(PRIVATE_NOINDEX_ROUTES).toEqual(
      expect.arrayContaining([
        "/app",
        "/app/refund-requests",
        "/app/action-requests",
        "/app/onboarding",
        "/app/stripe",
        "/demo-access",
        "/login",
      ]),
    );

    const metadata = createNoindexMetadata({
      title: "RefundHold App",
      description: "Private RefundHold app dashboard.",
      path: "/app",
    });

    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });

  it("keeps public SEO copy free of legacy internal language", () => {
    const publicSeoText = JSON.stringify(PUBLIC_INDEXABLE_PAGES);

    for (const term of forbiddenPublicSeoTerms) {
      expect(publicSeoText).not.toContain(term);
    }
  });
});
