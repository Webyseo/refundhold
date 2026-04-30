import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DocsNavigation } from "./docs-navigation";

describe("DocsNavigation", () => {
  it("links every core docs page near the top of documentation pages", () => {
    const html = renderToStaticMarkup(<DocsNavigation currentPath="/docs/api" />);

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
