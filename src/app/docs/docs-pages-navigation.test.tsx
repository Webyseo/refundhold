import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ApiDocsPage from "./api/page";
import PilotAcceptancePage from "./pilot-acceptance/page";
import PreventBypassPage from "./prevent-bypass/page";
import QuickstartPage from "./quickstart/page";
import StripeTestModePage from "./stripe-test-mode/page";
import TestModePilotPage from "./test-mode-pilot/page";
import TestModeRunbookPage from "./test-mode-runbook/page";

const docsPages = [
  ["quickstart", QuickstartPage],
  ["api", ApiDocsPage],
  ["stripe test-mode", StripeTestModePage],
  ["prevent bypass", PreventBypassPage],
  ["test-mode pilot", TestModePilotPage],
  ["pilot acceptance", PilotAcceptancePage],
  ["test-mode runbook", TestModeRunbookPage],
] as const;

describe("documentation page navigation", () => {
  it.each(docsPages)("%s page includes core docs navigation", (_name, Page) => {
    const html = renderToStaticMarkup(<Page />);

    expect(html).toContain("Docs navigation");
    expect(html).toContain("href=\"/docs\"");
    expect(html).toContain("href=\"/docs/quickstart\"");
    expect(html).toContain("href=\"/docs/api\"");
    expect(html).toContain("href=\"/docs/test-mode-runbook\"");
    expect(html).toContain("href=\"/docs/stripe-test-mode\"");
    expect(html).toContain("href=\"/docs/test-mode-pilot\"");
    expect(html).toContain("href=\"/docs/pilot-acceptance\"");
    expect(html).toContain("href=\"/docs/prevent-bypass\"");
  });
});
