import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublicFooter, PublicHeader } from "./public-header";

describe("PublicHeader", () => {
  it("renders global public navigation with accessible mobile disclosure", () => {
    const html = renderToStaticMarkup(<PublicHeader currentPath="/docs/api" />);

    expect(html).toContain("href=\"/\"");
    expect(html).toContain("RefundHold");
    expect(html).toContain("href=\"/demo\"");
    expect(html).toContain("href=\"/demo/reviewer\"");
    expect(html).toContain("href=\"/docs\"");
    expect(html).toContain("href=\"/security\"");
    expect(html).toContain("href=\"/contact\"");
    expect(html).toContain("aria-label=\"Open navigation menu\"");
    expect(html).toContain("aria-current=\"page\"");
    expect(html).toContain("max-w-7xl");
    expect(html).toContain("px-6");
  });

  it("renders the shared public footer with legal links and Stripe disclaimer", () => {
    const html = renderToStaticMarkup(<PublicFooter />);

    expect(html).toContain("href=\"/contact\"");
    expect(html).toContain("href=\"/security\"");
    expect(html).toContain("href=\"/privacy\"");
    expect(html).toContain("href=\"/terms\"");
    expect(html).toContain(
      "RefundHold is not affiliated with, endorsed by, or sponsored by",
    );
    expect(html).toContain("Stripe is a trademark of Stripe, Inc.");
  });
});
