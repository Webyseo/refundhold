import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FeedbackContent } from "./page";

describe("private feedback UI", () => {
  it("keeps feedback inside the private demo context without a dead form", () => {
    const html = renderToStaticMarkup(<FeedbackContent />);

    expect(html).toContain("Send feedback");
    expect(html).toContain("Tell us what was unclear in the private demo.");
    expect(html).toContain("What was confusing?");
    expect(html).toContain("What were you trying to do?");
    expect(html).toContain("Optional email");
    expect(html).toContain("Feedback capture is not connected in this demo.");
    expect(html).toContain("mailto:hello@refundhold.com");
    expect(html).not.toContain("AUTHRAIL_");
    expect(html).not.toContain("ActionRequest");
  });
});
