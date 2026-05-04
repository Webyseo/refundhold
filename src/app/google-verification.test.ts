import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const verificationPath = path.join(
  process.cwd(),
  "public",
  "googlecc1eb2acf298ed2a.html",
);

describe("Google Search Console verification file", () => {
  it("exists in public assets with the exact verification body", () => {
    expect(readFileSync(verificationPath, "utf8")).toBe(
      "google-site-verification: googlecc1eb2acf298ed2a.html",
    );
  });

  it("is included in the production Docker runner image assets", () => {
    const dockerfile = readFileSync(path.join(process.cwd(), "Dockerfile"), "utf8");

    expect(dockerfile).toContain("public ./public");
  });
});
