import { describe, expect, it } from "vitest";

import {
  generateDemoApiKey,
  hashApiKey,
  verifyApiKey,
} from "./api-keys";

describe("API key utilities", () => {
  it("generates a readable demo API key with a prefix", () => {
    const generated = generateDemoApiKey();

    expect(generated.key).toMatch(/^ar_demo_[a-z0-9]{10}_[a-z0-9]{32}$/);
    expect(generated.prefix).toMatch(/^ar_demo_[a-z0-9]{10}$/);
    expect(generated.key.startsWith(`${generated.prefix}_`)).toBe(true);
  });

  it("hashes API keys without storing the raw key", () => {
    const { key } = generateDemoApiKey();
    const hash = hashApiKey(key);

    expect(hash).toMatch(/^scrypt:v1:[a-f0-9]{32}:[a-f0-9]{64}$/);
    expect(hash).not.toContain(key);
  });

  it("verifies a provided key against a stored hash", () => {
    const { key } = generateDemoApiKey();
    const hash = hashApiKey(key);

    expect(verifyApiKey(key, hash)).toBe(true);
  });

  it("rejects an incorrect key for a stored hash", () => {
    const first = generateDemoApiKey();
    const second = generateDemoApiKey();
    const hash = hashApiKey(first.key);

    expect(verifyApiKey(second.key, hash)).toBe(false);
  });

  it("rejects malformed stored hashes", () => {
    const { key } = generateDemoApiKey();

    expect(verifyApiKey(key, "not-a-valid-hash")).toBe(false);
  });
});
