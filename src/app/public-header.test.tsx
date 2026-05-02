import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublicHeader } from "./public-header";

describe("PublicHeader", () => {
  it("renders global public navigation with accessible mobile disclosure", () => {
    const html = renderToStaticMarkup(<PublicHeader />);

    expect(html).toContain("href=\"/\"");
    expect(html).toContain("RefundHold");
    expect(html).toContain("href=\"/demo\"");
    expect(html).toContain("href=\"/demo/reviewer\"");
    expect(html).toContain("href=\"/docs\"");
    expect(html).toContain("href=\"/security\"");
    expect(html).toContain("href=\"/contact\"");
    expect(html).toContain("aria-label=\"Open navigation menu\"");
    expect(html).toContain("max-w-7xl");
    expect(html).toContain("px-6");
  });
});
