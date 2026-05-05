import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import {
  checkOpenSourceReleaseInventory,
  formatInventoryReport,
} from "./check-open-source-release-inventory";

const fixtureRoots: string[] = [];

describe("checkOpenSourceReleaseInventory", () => {
  afterEach(() => {
    for (const root of fixtureRoots.splice(0)) {
      rmSync(root, {
        force: true,
        recursive: true,
      });
    }
  });

  it("passes clean public docs", async () => {
    const root = createFixtureRoot();
    await writeFixture(
      root,
      "README.md",
      [
        "# RefundHold",
        "Stop AI agents from refunding Stripe money without approval.",
        "Demo simulation does not move money.",
        "Stripe test-mode uses test objects only.",
        "Live refunds are blocked in v1.",
      ].join("\n"),
    );

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(true);
    expect(formatInventoryReport(result)).toContain("PASS");
  });

  it("fails on forbidden legacy public terms", async () => {
    const root = createFixtureRoot();
    await writeFixture(root, "README.md", "AuthRail approval inbox");

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(false);
    expect(result.findings).toEqual([
      expect.objectContaining({
        filePath: "README.md",
        matched: "AuthRail",
        ruleName: "legacy-public-term",
      }),
    ]);
    expect(formatInventoryReport(result)).toContain("README.md");
  });

  it("fails on public legacy API route mentions", async () => {
    const root = createFixtureRoot();
    await writeFixture(
      root,
      "docs/open-source.md",
      "Call POST /api/v1/action-requests for refunds.",
    );

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(false);
    expect(result.findings[0]).toEqual(
      expect.objectContaining({
        matched: "/api/v1/action-requests",
        ruleName: "legacy-public-term",
      }),
    );
  });

  it("fails on real-looking live Stripe keys", async () => {
    const root = createFixtureRoot();
    await writeFixture(root, "SECURITY.md", "STRIPE_SECRET=sk_live_1234567890abcdef");

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(false);
    expect(result.findings[0]).toEqual(
      expect.objectContaining({
        matched: "stripe_live_secret_key",
        ruleName: "secret-like-value",
      }),
    );
  });

  it("fails on private key blocks", async () => {
    const root = createFixtureRoot();
    await writeFixture(
      root,
      "DISCLAIMER.md",
      "-----BEGIN PRIVATE KEY-----\nabc123\n-----END PRIVATE KEY-----",
    );

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(false);
    expect(result.findings[0]).toEqual(
      expect.objectContaining({
        matched: "private_key_block",
        ruleName: "secret-like-value",
      }),
    );
  });

  it("passes safe placeholders", async () => {
    const root = createFixtureRoot();
    await writeFixture(
      root,
      "docs/local-demo.md",
      [
        "Use Bearer <agent_api_key>.",
        "Use <stripe_test_object_id>.",
        "The local key may look like ar_demo_<prefix>_<secret>.",
        "Send requests to localhost with customer@example.test.",
        "Use stripe_mode demo_simulation.",
      ].join("\n"),
    );

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(true);
  });

  it("passes negative safety statements about live refunds", async () => {
    const root = createFixtureRoot();
    await writeFixture(
      root,
      "README.md",
      [
        "Live refunds are blocked in v1.",
        "Demo simulation does not move money.",
        "RefundHold is not affiliated with, endorsed by, or sponsored by Stripe.",
      ].join("\n"),
    );

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(true);
  });

  it("fails on risky live-money readiness claims", async () => {
    const root = createFixtureRoot();
    await writeFixture(root, "README.md", "Production live refunds ready.");

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(false);
    expect(result.findings[0]).toEqual(
      expect.objectContaining({
        matched: "production live refunds ready",
        ruleName: "unsafe-live-refund-claim",
      }),
    );
  });

  it("does not scan docs/internal by default", async () => {
    const root = createFixtureRoot();
    await writeFixture(root, "README.md", "RefundHold demo simulation.");
    await writeFixture(
      root,
      "docs/internal/open-source-readiness-audit.md",
      "AuthRail sk_live_1234567890abcdef production live refunds ready",
    );

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(true);
    expect(result.scannedFiles).toEqual(["README.md"]);
  });

  it("does not scan root-level operational docs by default", async () => {
    const root = createFixtureRoot();
    await writeFixture(root, "README.md", "RefundHold demo simulation.");

    const operationalRootDocs = [
      ["README_DEPLOY", "_DOKPLOY.md"].join(""),
      ["AUTH_ACTIVATION", "_RUNBOOK.md"].join(""),
      ["STRIPE_TEST_MODE", "_E2E.md"].join(""),
      ["BACKUP", "_RESTORE.md"].join(""),
      ["docs/DEVELOPMENT", "_HANDOFF.md"].join(""),
    ];

    for (const filePath of operationalRootDocs) {
      await writeFixture(
        root,
        filePath,
        "AuthRail sk_live_1234567890abcdef production live refunds ready",
      );
    }

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(true);
    expect(result.scannedFiles).toEqual(["README.md"]);
  });

  it("scans the public release checklist by default", async () => {
    const root = createFixtureRoot();
    await writeFixture(
      root,
      "docs/public-release-checklist.md",
      [
        "# Public Release Checklist",
        "",
        "RefundHold is not ready for public repository publication yet.",
      ].join("\n"),
    );

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(true);
    expect(result.scannedFiles).toEqual(["docs/public-release-checklist.md"]);
  });

  it("passes the real public release checklist", () => {
    const result = checkOpenSourceReleaseInventory({
      rootDir: process.cwd(),
      surfaceEntries: ["docs/public-release-checklist.md"],
    });

    expect(result.ok).toBe(true);
    expect(result.scannedFiles).toEqual(["docs/public-release-checklist.md"]);
  });

  it("fails unsafe live-money claims in the public release checklist", async () => {
    const root = createFixtureRoot();
    await writeFixture(
      root,
      "docs/public-release-checklist.md",
      "Production live refunds ready.",
    );

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(false);
    expect(result.findings).toEqual([
      expect.objectContaining({
        filePath: "docs/public-release-checklist.md",
        matched: "production live refunds ready",
        ruleName: "unsafe-live-refund-claim",
      }),
    ]);
  });

  it("scans package metadata files by default", async () => {
    const root = createFixtureRoot();
    await writeFixture(
      root,
      "package.json",
      JSON.stringify({
        name: "refundhold",
        private: true,
      }),
    );
    await writeFixture(
      root,
      "pnpm-workspace.yaml",
      ['packages:', '  - "."', '  - "packages/*"'].join("\n"),
    );
    await writeFixture(
      root,
      "packages/refundhold-core/package.json",
      JSON.stringify({
        name: "@refundhold/core",
        private: true,
      }),
    );

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(true);
    expect(result.scannedFiles).toEqual([
      "package.json",
      "packages/refundhold-core/package.json",
      "pnpm-workspace.yaml",
    ]);
  });

  it("fails when package metadata uses the legacy internal package name", async () => {
    const root = createFixtureRoot();
    await writeFixture(
      root,
      "package.json",
      JSON.stringify({
        name: "authrail",
        private: true,
      }),
    );

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(false);
    expect(result.findings).toEqual([
      expect.objectContaining({
        filePath: "package.json",
        matched: "authrail",
        ruleName: "legacy-public-term",
      }),
    ]);
  });

  it("passes real package metadata with RefundHold naming", () => {
    const rootPackage = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      name?: string;
      private?: boolean;
    };

    expect(rootPackage).toEqual(
      expect.objectContaining({
        name: "refundhold",
        private: true,
      }),
    );

    const result = checkOpenSourceReleaseInventory({
      rootDir: process.cwd(),
      surfaceEntries: [
        "package.json",
        "pnpm-workspace.yaml",
        "packages/refundhold-core/package.json",
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.scannedFiles).toEqual([
      "package.json",
      "packages/refundhold-core/package.json",
      "pnpm-workspace.yaml",
    ]);
  });

  it("scans packages/refundhold-core", async () => {
    const root = createFixtureRoot();
    await writeFixture(
      root,
      "packages/refundhold-core/src/index.ts",
      "export const unsafe = 'AuthRail';",
    );

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(false);
    expect(result.findings[0]?.filePath).toBe(
      "packages/refundhold-core/src/index.ts",
    );
  });

  it("scans src/lib/public-contracts", async () => {
    const root = createFixtureRoot();
    await writeFixture(
      root,
      "src/lib/public-contracts/refund-requests.ts",
      "const leaked = 'sk_live_1234567890abcdef';",
    );

    const result = checkOpenSourceReleaseInventory({
      rootDir: root,
    });

    expect(result.ok).toBe(false);
    expect(result.findings[0]?.filePath).toBe(
      "src/lib/public-contracts/refund-requests.ts",
    );
  });
});

function createFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), "refundhold-release-inventory-"));
  fixtureRoots.push(root);

  return root;
}

async function writeFixture(root: string, relativePath: string, contents: string) {
  const absolutePath = join(root, relativePath);
  await mkdir(dirname(absolutePath), {
    recursive: true,
  });
  writeFileSync(absolutePath, contents);
}
