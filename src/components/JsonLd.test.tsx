import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JsonLd } from "./JsonLd";

describe("JsonLd", () => {
  it("renders valid application/ld+json", () => {
    const html = renderToStaticMarkup(
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "RefundHold",
          url: "https://refundhold.com/",
        }}
      />,
    );
    const json = html.match(
      /<script type="application\/ld\+json">(.*)<\/script>/,
    )?.[1];

    expect(json).toBeTruthy();
    expect(JSON.parse(json ?? "{}")).toMatchObject({
      "@type": "WebSite",
      name: "RefundHold",
    });
  });
});
