import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ReviewerDemoPage from "./page";

describe("public reviewer demo page", () => {
  it("renders a public read-only reviewer dashboard with curated refund evidence", () => {
    const html = renderToStaticMarkup(<ReviewerDemoPage />);

    expect(html).toContain("Reviewer dashboard demo");
    expect(html).toContain("Read-only demo");
    expect(html).toContain("No login required. No Stripe calls.");
    expect(html).toContain("billing-upgrade@example.test");
    expect(html).toContain("demo-refund-420");
    expect(html).toContain("$50-$500 -&gt; human approval required");
    expect(html).toContain("Demo simulation");
    expect(html).toContain("Stripe test-mode");
    expect(html).toContain("Needs review");
    expect(html).toContain("Approved today");
    expect(html).toContain("Blocked by policy");
    expect(html).toContain("Demo/test executions recorded");
    expect(html).toContain("Search customer, refund, or policy");
    expect(html).toContain("Highest risk first");
    expect(html).toContain("Finance reviewer");
    expect(html).toContain("Due in 12 min");
    expect(html).toContain("Priority");
    expect(html).toContain("Customer says they were charged twice after upgrading their plan and asks for a refund before the next billing cycle.");
    expect(html).toContain("Order ID");
    expect(html).toContain("order_demo_420");
    expect(html).toContain("Payment reference");
    expect(html).toContain("pi_test_demo_420");
    expect(html).toContain("Refundable amount");
    expect(html).toContain("$420.00 USD");
    expect(html).toContain("Previous refunds");
    expect(html).toContain("None in last 90 days");
    expect(html).toContain("What happens next");
    expect(html).toContain("RefundHold records the reviewer decision.");
    expect(html).toContain("The refund cannot continue automatically.");
    expect(html).toContain("href=\"/demo\"");
    expect(html).toContain("href=\"/docs/api\"");
    expect(html).toContain("href=\"/docs/stripe-test-mode\"");
    expect(html).toContain("href=\"/docs/prevent-bypass\"");
    expect(html).toContain("href=\"/contact\"");
    expect(html).not.toContain("AuthRail");
    expect(html).not.toContain("ActionRequest");
    expect(html).not.toContain("control layer");
    expect(html).not.toContain("dry_run");
    expect(html).not.toContain("stripe_test");
    expect(html).not.toContain("approval_required");
  });
});
