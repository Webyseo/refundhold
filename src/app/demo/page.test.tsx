import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DemoPage from "./page";

describe("public refund demo", () => {
  it("starts with a guided no-money refund proposal instead of a technical test screen", () => {
    const html = renderToStaticMarkup(<DemoPage />);

    expect(html).toContain(
      "See RefundHold stop a risky AI refund before it reaches Stripe",
    );
    expect(html).toContain("An AI support agent proposes a $420 refund.");
    expect(html).toContain("No login. No real Stripe money. Demo only.");
    expect(html).toContain("AI agent wants to refund $420");
    expect(html).toContain("Customer says they were double charged");
    expect(html).toContain("AI support agent");
    expect(html).toContain("Stripe refund");
    expect(html).toContain("Start demo refund");
    expect(html).toContain("aria-live=\"polite\"");
    expect(html).toContain("role=\"status\"");
    expect(html).not.toContain("AuthRail");
    expect(html).not.toContain("ActionRequest");
    expect(html).not.toContain("dry_run");
    expect(html).not.toContain("connector");
  });
});
