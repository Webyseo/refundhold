import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("landing page", () => {
  it("renders the pre-launch product message, activation CTAs, and safety note", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain(
      "Stop AI agents from refunding Stripe money without approval",
    );
    expect(html).toContain(
      "RefundHold sits between your AI support agent and Stripe.",
    );
    expect(html).toContain("href=\"/demo\"");
    expect(html).toContain("Try the refund demo");
    expect(html).toContain("href=\"/docs/quickstart\"");
    expect(html).toContain("View 5-minute setup");
    expect(html).toContain("Demo mode only. No live Stripe money moves.");
    expect(html).toContain("AI agent proposes refund");
    expect(html).toContain("RefundHold checks policy");
    expect(html).toContain("Risky refund waits for approval");
    expect(html).toContain("Human approves or rejects");
    expect(html).toContain("Audit trail is recorded");
    expect(html).toContain("Check refund risk");
    expect(html).toContain("Hold risky refunds");
    expect(html).toContain("Record every decision");
    expect(html).not.toContain("AuthRail");
    expect(html).not.toContain("ActionRequest");
    expect(html).not.toContain("AUTHRAIL_");
    expect(html).not.toContain("dry_run");
  });
});
