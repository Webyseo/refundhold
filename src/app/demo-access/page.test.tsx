import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import DemoAccessPage from "./page";

describe("private demo access page", () => {
  const originalEnabled = process.env.AUTHRAIL_DEMO_ACCESS_ENABLED;
  const originalPassword = process.env.AUTHRAIL_DEMO_ACCESS_PASSWORD;

  afterEach(() => {
    process.env.AUTHRAIL_DEMO_ACCESS_ENABLED = originalEnabled;
    process.env.AUTHRAIL_DEMO_ACCESS_PASSWORD = originalPassword;
  });

  it("keeps the password gate human-readable without exposing env diagnostics", async () => {
    process.env.AUTHRAIL_DEMO_ACCESS_ENABLED = "true";
    process.env.AUTHRAIL_DEMO_ACCESS_PASSWORD = "unit-test-password";

    const html = renderToStaticMarkup(
      await DemoAccessPage({
        searchParams: Promise.resolve({
          error: "invalid",
        }),
      }),
    );

    expect(html).toContain("Private demo access");
    expect(html).toContain(
      "Enter the password provided by the RefundHold team.",
    );
    expect(html).toContain("Invalid password.");
    expect(html).toContain("Please check the password provided by the");
    expect(html).toContain("What this demo includes");
    expect(html).toContain("A reviewer dashboard with sample refund requests");
    expect(html).toContain("AI-proposed Stripe refunds");
    expect(html).toContain("Audit trail records");
    expect(html).toContain("No real Stripe money moves");
    expect(html).toContain("Want to try the public demo instead?");
    expect(html).toContain("href=\"/demo\"");
    expect(html).not.toContain("AUTHRAIL_");
    expect(html).not.toContain("diagnostic");
  });

  it("shows a clear exited state when the reviewer leaves the private demo", async () => {
    process.env.AUTHRAIL_DEMO_ACCESS_ENABLED = "true";
    process.env.AUTHRAIL_DEMO_ACCESS_PASSWORD = "unit-test-password";

    const html = renderToStaticMarkup(
      await DemoAccessPage({
        searchParams: Promise.resolve({
          exited: "1",
        }),
      }),
    );

    expect(html).toContain("You have exited the private demo.");
    expect(html).toContain(
      "You can re-enter with your password or open the public demo.",
    );
    expect(html).not.toContain("AUTHRAIL_");
  });
});
