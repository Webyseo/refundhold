import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export type InventoryRuleName =
  | "legacy-public-term"
  | "secret-like-value"
  | "unsafe-live-refund-claim";

export type InventoryFinding = {
  filePath: string;
  ruleName: InventoryRuleName;
  matched: string;
  guidance: string;
};

export type InventoryCheckResult = {
  ok: boolean;
  findings: InventoryFinding[];
  scannedFiles: string[];
};

export type InventoryAllowlistEntry = {
  filePath: string;
  ruleName: InventoryRuleName;
  matched?: string;
  reason: string;
};

export type InventoryCheckOptions = {
  rootDir?: string;
  surfaceEntries?: string[];
  allowlist?: InventoryAllowlistEntry[];
};

export const DEFAULT_PUBLIC_SURFACE_ENTRIES = [
  "package.json",
  "pnpm-workspace.yaml",
  "README.md",
  "SECURITY.md",
  "DISCLAIMER.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "docs/open-source.md",
  "docs/local-demo.md",
  "packages/refundhold-core/package.json",
  "packages/refundhold-core",
  "src/lib/public-contracts",
  "src/app/docs",
  "src/app/page.tsx",
  "src/app/demo/page.tsx",
  "src/app/demo/reviewer/page.tsx",
  "src/app/security/page.tsx",
  "src/app/privacy/page.tsx",
  "src/app/terms/page.tsx",
  "src/app/contact/page.tsx",
];

const TEXT_EXTENSIONS = new Set([
  ".json",
  ".md",
  ".mts",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);

const LEGACY_PUBLIC_TERMS = [
  "/api/v1/action-requests",
  "AuthRail",
  "authrail",
  "AUTHRAIL_",
  "ActionRequest",
  "action_request_id",
  "action-requests",
  "dry_run",
];

const WORD_LEGACY_PUBLIC_TERMS = ["connector"];

const SECRET_PATTERNS = [
  {
    matched: "stripe_live_secret_key",
    pattern: /\bsk_live_[A-Za-z0-9]{16,}\b/g,
  },
  {
    matched: "stripe_live_restricted_key",
    pattern: /\brk_live_[A-Za-z0-9]{16,}\b/g,
  },
  {
    matched: "github_token",
    pattern: /\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  },
  {
    matched: "aws_access_key",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    matched: "private_key_block",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    matched: "bearer_token",
    pattern: /\bBearer\s+[A-Za-z0-9][A-Za-z0-9._~+/=-]{23,}\b/g,
  },
];

const PASSWORD_ASSIGNMENT_PATTERN =
  /\b(?:password|passwd|pwd)\b\s*[:=]\s*["']?([^"'\s#;]+)/gi;

const RISKY_LIVE_REFUND_PHRASES = [
  "live refunds enabled",
  "production live refunds ready",
  "move live money",
  "autonomous live refunds",
  "enterprise-grade security",
  "compliance solved",
  "stripe-approved",
];

const DEFAULT_ALLOWLIST: InventoryAllowlistEntry[] = [
  {
    filePath: "packages/refundhold-core/src/public-surface.test.ts",
    ruleName: "legacy-public-term",
    reason:
      "This package guard test intentionally lists forbidden public terms to prove the package source does not expose them.",
  },
  {
    filePath: "src/app/docs/public-docs-language.test.tsx",
    ruleName: "legacy-public-term",
    reason:
      "This public docs guard test intentionally lists forbidden public terms to prove rendered docs do not expose them.",
  },
  {
    filePath: "src/app/docs/api/page.test.tsx",
    ruleName: "legacy-public-term",
    matched: "AuthRail",
    reason:
      "This page test intentionally asserts that rendered public docs exclude the legacy product name.",
  },
  {
    filePath: "src/app/docs/api/page.test.tsx",
    ruleName: "unsafe-live-refund-claim",
    matched: "stripe-approved",
    reason:
      "This page test intentionally asserts that rendered public docs exclude Stripe-approved positioning.",
  },
  {
    filePath: "src/app/docs/pilot-acceptance/page.test.tsx",
    ruleName: "unsafe-live-refund-claim",
    matched: "stripe-approved",
    reason:
      "This page test intentionally asserts that rendered public docs exclude Stripe-approved positioning.",
  },
  {
    filePath: "src/app/docs/prevent-bypass/page.test.tsx",
    ruleName: "legacy-public-term",
    matched: "AuthRail",
    reason:
      "This page test intentionally asserts that rendered public docs exclude the legacy product name.",
  },
  {
    filePath: "src/app/docs/prevent-bypass/page.test.tsx",
    ruleName: "legacy-public-term",
    matched: "ActionRequest",
    reason:
      "This page test intentionally asserts that rendered public docs exclude the legacy model name.",
  },
  {
    filePath: "src/app/docs/prevent-bypass/page.test.tsx",
    ruleName: "unsafe-live-refund-claim",
    matched: "stripe-approved",
    reason:
      "This page test intentionally asserts that rendered public docs exclude Stripe-approved positioning.",
  },
  {
    filePath: "src/app/docs/prevent-bypass/page.test.tsx",
    ruleName: "unsafe-live-refund-claim",
    matched: "enterprise-grade security",
    reason:
      "This page test intentionally asserts that rendered public docs exclude broad security claims.",
  },
  {
    filePath: "src/app/docs/quickstart/page.test.tsx",
    ruleName: "unsafe-live-refund-claim",
    matched: "stripe-approved",
    reason:
      "This page test intentionally asserts that rendered public docs exclude Stripe-approved positioning.",
  },
  {
    filePath: "src/app/docs/stripe-test-mode/page.test.tsx",
    ruleName: "legacy-public-term",
    matched: "AUTHRAIL_",
    reason:
      "This page test intentionally asserts that rendered public docs exclude legacy environment variable names.",
  },
  {
    filePath: "src/app/docs/stripe-test-mode/page.test.tsx",
    ruleName: "legacy-public-term",
    matched: "connector",
    reason:
      "This page test intentionally asserts that rendered public docs exclude generic integration wording.",
  },
  {
    filePath: "src/app/docs/stripe-test-mode/page.test.tsx",
    ruleName: "unsafe-live-refund-claim",
    matched: "stripe-approved",
    reason:
      "This page test intentionally asserts that rendered public docs exclude Stripe-approved positioning.",
  },
  {
    filePath: "src/app/docs/test-mode-pilot/page.test.tsx",
    ruleName: "unsafe-live-refund-claim",
    matched: "stripe-approved",
    reason:
      "This page test intentionally asserts that rendered public docs exclude Stripe-approved positioning.",
  },
  {
    filePath: "src/app/docs/test-mode-runbook/page.test.tsx",
    ruleName: "legacy-public-term",
    matched: "AUTHRAIL_",
    reason:
      "This page test intentionally asserts that rendered public docs exclude legacy environment variable names.",
  },
  {
    filePath: "src/app/docs/test-mode-runbook/page.test.tsx",
    ruleName: "legacy-public-term",
    matched: "connector",
    reason:
      "This page test intentionally asserts that rendered public docs exclude generic integration wording.",
  },
  {
    filePath: "src/app/docs/test-mode-runbook/page.test.tsx",
    ruleName: "unsafe-live-refund-claim",
    matched: "stripe-approved",
    reason:
      "This page test intentionally asserts that rendered public docs exclude Stripe-approved positioning.",
  },
];

export function checkOpenSourceReleaseInventory({
  rootDir = process.cwd(),
  surfaceEntries = DEFAULT_PUBLIC_SURFACE_ENTRIES,
  allowlist = [],
}: InventoryCheckOptions = {}): InventoryCheckResult {
  const allAllowlist = [...DEFAULT_ALLOWLIST, ...allowlist];
  const scannedFiles = collectPublicSurfaceFiles(rootDir, surfaceEntries);
  const findings = scannedFiles.flatMap((filePath) => {
    const source = readFileSync(path.join(rootDir, filePath), "utf8");

    return inspectPublicSurfaceFile({
      allowlist: allAllowlist,
      filePath,
      source,
    });
  });

  return {
    ok: findings.length === 0,
    findings,
    scannedFiles,
  };
}

export function formatInventoryReport(result: InventoryCheckResult): string {
  if (result.ok) {
    return [
      "PASS open-source release inventory check",
      `Scanned files: ${result.scannedFiles.length}`,
    ].join("\n");
  }

  const lines = [
    "FAIL open-source release inventory check",
    `Scanned files: ${result.scannedFiles.length}`,
    `Findings: ${result.findings.length}`,
  ];

  for (const finding of result.findings) {
    lines.push(
      `- ${finding.filePath}`,
      `  rule: ${finding.ruleName}`,
      `  match: ${finding.matched}`,
      `  guidance: ${finding.guidance}`,
    );
  }

  return lines.join("\n");
}

function inspectPublicSurfaceFile({
  allowlist,
  filePath,
  source,
}: {
  allowlist: InventoryAllowlistEntry[];
  filePath: string;
  source: string;
}): InventoryFinding[] {
  return [
    ...findLegacyPublicTerms({ allowlist, filePath, source }),
    ...findSecretLikeValues({ allowlist, filePath, source }),
    ...findRiskyLiveRefundClaims({ allowlist, filePath, source }),
  ];
}

function findLegacyPublicTerms({
  allowlist,
  filePath,
  source,
}: {
  allowlist: InventoryAllowlistEntry[];
  filePath: string;
  source: string;
}) {
  const findings: InventoryFinding[] = [];

  for (const term of LEGACY_PUBLIC_TERMS) {
    const occurrenceCount = findStringIndexes(source, term).length;

    for (let occurrence = 0; occurrence < occurrenceCount; occurrence += 1) {
      addFinding({
        allowlist,
        filePath,
        findings,
        matched: term,
        ruleName: "legacy-public-term",
        guidance:
          "Use RefundHold public refund-request language in public release surfaces.",
      });
    }
  }

  for (const term of WORD_LEGACY_PUBLIC_TERMS) {
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, "g");
    const occurrenceCount = [...source.matchAll(pattern)].length;

    for (let occurrence = 0; occurrence < occurrenceCount; occurrence += 1) {
      addFinding({
        allowlist,
        filePath,
        findings,
        matched: term,
        ruleName: "legacy-public-term",
        guidance:
          "Use Stripe-specific or demo simulation language instead of generic integration wording.",
      });
    }
  }

  return findings;
}

function findSecretLikeValues({
  allowlist,
  filePath,
  source,
}: {
  allowlist: InventoryAllowlistEntry[];
  filePath: string;
  source: string;
}) {
  const findings: InventoryFinding[] = [];

  for (const { matched, pattern } of SECRET_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const value = match[0] ?? "";

      if (isSafePlaceholder(value)) {
        continue;
      }

      addFinding({
        allowlist,
        filePath,
        findings,
        matched,
        ruleName: "secret-like-value",
        guidance:
          "Replace real-looking secrets, tokens, and keys with safe placeholders.",
      });
    }
  }

  for (const match of source.matchAll(PASSWORD_ASSIGNMENT_PATTERN)) {
    const value = match[1] ?? "";

    if (isSafePlaceholder(value)) {
      continue;
    }

    addFinding({
      allowlist,
      filePath,
      findings,
      matched: "password_assignment",
      ruleName: "secret-like-value",
      guidance:
        "Use placeholder password values only in public release surfaces.",
    });
  }

  return findings;
}

function findRiskyLiveRefundClaims({
  allowlist,
  filePath,
  source,
}: {
  allowlist: InventoryAllowlistEntry[];
  filePath: string;
  source: string;
}) {
  const findings: InventoryFinding[] = [];
  const lowerSource = source.toLowerCase();

  for (const phrase of RISKY_LIVE_REFUND_PHRASES) {
    for (const index of findStringIndexes(lowerSource, phrase)) {
      if (hasNegativeSafetyContext(lowerSource, index)) {
        continue;
      }

      addFinding({
        allowlist,
        filePath,
        findings,
        matched: phrase,
        ruleName: "unsafe-live-refund-claim",
        guidance:
          "Keep public release language clear that demo simulation and Stripe test-mode are safe boundaries and live refunds are blocked in v1.",
      });
    }
  }

  return findings;
}

function addFinding({
  allowlist,
  filePath,
  findings,
  matched,
  ruleName,
  guidance,
}: {
  allowlist: InventoryAllowlistEntry[];
  filePath: string;
  findings: InventoryFinding[];
  matched: string;
  ruleName: InventoryRuleName;
  guidance: string;
}) {
  if (
    isAllowedFinding({ allowlist, filePath, matched, ruleName }) ||
    isInventoryCheckerFile(filePath)
  ) {
    return;
  }

  findings.push({
    filePath,
    ruleName,
    matched,
    guidance,
  });
}

function collectPublicSurfaceFiles(rootDir: string, surfaceEntries: string[]) {
  const files = new Set<string>();

  for (const entry of surfaceEntries) {
    const absolutePath = path.join(rootDir, entry);

    if (!existsSync(absolutePath)) {
      continue;
    }

    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      for (const filePath of walkTextFiles(rootDir, absolutePath)) {
        files.add(filePath);
      }
    } else if (isTextFile(absolutePath)) {
      files.add(toRelativePath(rootDir, absolutePath));
    }
  }

  return [...files].sort();
}

function walkTextFiles(rootDir: string, directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    if (IGNORED_DIRECTORIES.has(entry)) {
      continue;
    }

    const absolutePath = path.join(directory, entry);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      files.push(...walkTextFiles(rootDir, absolutePath));
      continue;
    }

    if (isTextFile(absolutePath)) {
      files.push(toRelativePath(rootDir, absolutePath));
    }
  }

  return files;
}

function isTextFile(filePath: string) {
  return TEXT_EXTENSIONS.has(path.extname(filePath));
}

function toRelativePath(rootDir: string, absolutePath: string) {
  return path.relative(rootDir, absolutePath).split(path.sep).join("/");
}

function findStringIndexes(source: string, term: string) {
  const indexes: number[] = [];
  let nextIndex = source.indexOf(term);

  while (nextIndex !== -1) {
    indexes.push(nextIndex);
    nextIndex = source.indexOf(term, nextIndex + term.length);
  }

  return indexes;
}

function isAllowedFinding({
  allowlist,
  filePath,
  matched,
  ruleName,
}: {
  allowlist: InventoryAllowlistEntry[];
  filePath: string;
  matched?: string;
  ruleName: InventoryRuleName;
}) {
  return allowlist.some((entry) => {
    return (
      entry.filePath === filePath &&
      entry.ruleName === ruleName &&
      (!entry.matched || entry.matched === matched)
    );
  });
}

function isInventoryCheckerFile(filePath: string) {
  return (
    filePath === "scripts/check-open-source-release-inventory.ts" ||
    filePath === "scripts/check-open-source-release-inventory.test.ts"
  );
}

function hasNegativeSafetyContext(lowerSource: string, index: number) {
  const context = lowerSource.slice(Math.max(0, index - 100), index);

  return /\b(do not|does not|not|never|no|without|blocked)\b/.test(context);
}

function isSafePlaceholder(value: string) {
  const normalized = value.trim().toLowerCase();

  return (
    normalized.length === 0 ||
    (normalized.includes("<") && normalized.includes(">")) ||
    normalized.includes("placeholder") ||
    normalized.includes("example") ||
    normalized.includes("localhost") ||
    normalized.includes("demo_simulation") ||
    normalized.includes("changeme") ||
    normalized.includes("replace_me") ||
    normalized.includes("redacted") ||
    normalized === "demo" ||
    normalized === "test" ||
    normalized === "dummy" ||
    normalized.startsWith("ar_demo_")
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isMainModule() {
  const entrypoint = process.argv[1];

  return Boolean(
    entrypoint && import.meta.url === pathToFileURL(entrypoint).href,
  );
}

if (isMainModule()) {
  const result = checkOpenSourceReleaseInventory();
  console.log(formatInventoryReport(result));

  if (!result.ok) {
    process.exit(1);
  }
}
