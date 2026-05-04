import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ApiDocsPage from "./api/page";
import PilotAcceptancePage from "./pilot-acceptance/page";
import PreventBypassPage from "./prevent-bypass/page";
import QuickstartPage from "./quickstart/page";
import StripeTestModePage from "./stripe-test-mode/page";
import TestModePilotPage from "./test-mode-pilot/page";
import TestModeRunbookPage from "./test-mode-runbook/page";
import SecurityPage from "../security/page";

const publicSurfaces = [
  {
    name: "README.md",
    content: () => readFileSync(path.join(process.cwd(), "README.md"), "utf8"),
  },
  {
    name: "SECURITY.md",
    content: () => readFileSync(path.join(process.cwd(), "SECURITY.md"), "utf8"),
  },
  {
    name: "DISCLAIMER.md",
    content: () => readFileSync(path.join(process.cwd(), "DISCLAIMER.md"), "utf8"),
  },
  {
    name: "CONTRIBUTING.md",
    content: () => readFileSync(path.join(process.cwd(), "CONTRIBUTING.md"), "utf8"),
  },
  {
    name: "CODE_OF_CONDUCT.md",
    content: () =>
      readFileSync(path.join(process.cwd(), "CODE_OF_CONDUCT.md"), "utf8"),
  },
  {
    name: "docs/open-source.md",
    content: () =>
      readFileSync(path.join(process.cwd(), "docs/open-source.md"), "utf8"),
  },
  {
    name: "docs/local-demo.md",
    content: () =>
      readFileSync(path.join(process.cwd(), "docs/local-demo.md"), "utf8"),
  },
  {
    name: "quickstart docs",
    content: () => renderToStaticMarkup(<QuickstartPage />),
  },
  {
    name: "api docs",
    content: () => renderToStaticMarkup(<ApiDocsPage />),
  },
  {
    name: "test-mode runbook docs",
    content: () => renderToStaticMarkup(<TestModeRunbookPage />),
  },
  {
    name: "test-mode pilot docs",
    content: () => renderToStaticMarkup(<TestModePilotPage />),
  },
  {
    name: "stripe test-mode docs",
    content: () => renderToStaticMarkup(<StripeTestModePage />),
  },
  {
    name: "prevent bypass docs",
    content: () => renderToStaticMarkup(<PreventBypassPage />),
  },
  {
    name: "pilot acceptance docs",
    content: () => renderToStaticMarkup(<PilotAcceptancePage />),
  },
  {
    name: "security page",
    content: () => renderToStaticMarkup(<SecurityPage />),
  },
];

const forbiddenPublicTerms = [
  "AuthRail",
  "authrail",
  "AUTHRAIL_",
  "ActionRequest",
  "/api/v1/action-requests",
  "dry_run",
  "connector",
];

describe("public docs language", () => {
  it.each(publicSurfaces)("$name uses public RefundHold language only", ({ content }) => {
    const rendered = content();

    for (const term of forbiddenPublicTerms) {
      expect(rendered).not.toContain(term);
    }
  });
});
