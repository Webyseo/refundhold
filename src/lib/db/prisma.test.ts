import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const prismaClient = vi.fn(function PrismaClientMock(this: unknown) {
    return this;
  });
  const prismaPg = vi.fn(function PrismaPgMock(this: unknown) {
    return this;
  });

  return {
    prismaClient,
    prismaPg,
  };
});

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: mocks.prismaPg,
}));

vi.mock("../../generated/prisma/client", () => ({
  PrismaClient: mocks.prismaClient,
}));

describe("getPrismaClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as typeof globalThis & { authRailPrisma?: unknown })
      .authRailPrisma;
    mocks.prismaClient.mockClear();
    mocks.prismaPg.mockClear();
    vi.resetModules();
  });

  it("reuses one Prisma client in production server processes", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");
    vi.stubEnv("NODE_ENV", "production");

    const { getPrismaClient } = await import("./prisma");

    const first = await getPrismaClient();
    const second = await getPrismaClient();

    expect(first).toBe(second);
    expect(mocks.prismaClient).toHaveBeenCalledTimes(1);
    expect(mocks.prismaPg).toHaveBeenCalledTimes(1);
  });
});
