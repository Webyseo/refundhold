import { Children, isValidElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";

import { GoogleAnalytics, googleAnalyticsMeasurementId } from "./google-analytics";

describe("GoogleAnalytics", () => {
  it("renders the Google tag script and config with the RefundHold measurement ID", () => {
    const element = GoogleAnalytics();
    const scripts = Children.toArray(element.props.children).filter(
      isValidElement,
    ) as ReactElement<Record<string, unknown>>[];

    expect(googleAnalyticsMeasurementId).toBe("G-9CR9HW1KM6");
    expect(scripts[0]?.props.src).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-9CR9HW1KM6",
    );
    expect(scripts[0]?.props.strategy).toBe("afterInteractive");
    expect(scripts[1]?.props.id).toBe("google-analytics");
    expect(scripts[1]?.props.strategy).toBe("afterInteractive");
    expect(String(scripts[1]?.props.children)).toContain(
      "gtag('config', 'G-9CR9HW1KM6')",
    );
    expect(String(scripts[1]?.props.children)).toContain(
      "window.dataLayer.push(arguments)",
    );
  });
});
