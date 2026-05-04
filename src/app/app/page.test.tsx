import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DashboardHomeContent } from "./page";

describe("app dashboard home content", () => {
  it("starts with the next refund review action instead of abstract metrics", () => {
    const html = renderToStaticMarkup(
      <DashboardHomeContent reviewHref="/app/refund-requests/demo-refund-420-review" />,
    );

    expect(html).toContain("3 refunds need your review");
    expect(html).toContain("These AI-proposed Stripe refunds are waiting");
    expect(html).toContain("before they can continue.");
    expect(html).toContain("Refund request");
    expect(html).toContain("Amount: $420");
    expect(html).toContain("Policy: Human approval required");
    expect(html).toContain(
      "Reason: AI support agent detected possible duplicate billing",
    );
    expect(html).toContain("Requested by: AI support agent");
    expect(html).toContain("Demo simulation");
    expect(html).toContain("No live Stripe money moves.");
    expect(html).toContain(
      "RefundHold records reviewer decisions and audit trail events",
    );
    expect(html).toContain("href=\"/app/refund-requests/demo-refund-420-review\"");
    expect(html).toContain("Review refund");
    expect(html).toContain("Want to test setup?");
    expect(html).toContain("href=\"/app/onboarding\"");
    expect(html).toContain("Start onboarding");
    expect(html).toContain("Pending review");
    expect(html).toContain("Approved");
    expect(html).toContain("Rejected");
    expect(html).toContain("Executed");
    expect(html).not.toContain("ActionRequest");
    expect(html).not.toContain("/app/action-requests");
  });
});
