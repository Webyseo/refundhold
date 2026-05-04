import { describe, expect, it } from "vitest";

import {
  readEnabledEnvWithLegacy,
  readEnvWithLegacy,
  readOptionalEnvWithLegacy,
} from "./env";

describe("environment variable compatibility helpers", () => {
  it("returns the preferred value when both preferred and legacy names are set", () => {
    expect(
      readEnvWithLegacy(
        {
          REFUNDHOLD_FEATURE_FLAG: "preferred",
          AUTHRAIL_FEATURE_FLAG: "legacy",
        },
        "REFUNDHOLD_FEATURE_FLAG",
        "AUTHRAIL_FEATURE_FLAG",
      ),
    ).toBe("preferred");
  });

  it("falls back to the legacy value when the preferred name is absent", () => {
    expect(
      readEnvWithLegacy(
        {
          AUTHRAIL_FEATURE_FLAG: "legacy",
        },
        "REFUNDHOLD_FEATURE_FLAG",
        "AUTHRAIL_FEATURE_FLAG",
      ),
    ).toBe("legacy");
  });

  it("trims optional values after applying preferred-name precedence", () => {
    expect(
      readOptionalEnvWithLegacy(
        {
          REFUNDHOLD_SECRET: "  preferred-secret  ",
          AUTHRAIL_SECRET: "legacy-secret",
        },
        "REFUNDHOLD_SECRET",
        "AUTHRAIL_SECRET",
      ),
    ).toBe("preferred-secret");
  });

  it("reads boolean-style enabled values after applying preferred-name precedence", () => {
    expect(
      readEnabledEnvWithLegacy(
        {
          REFUNDHOLD_ENABLED: "false",
          AUTHRAIL_ENABLED: "true",
        },
        "REFUNDHOLD_ENABLED",
        "AUTHRAIL_ENABLED",
      ),
    ).toBe(false);
  });
});
