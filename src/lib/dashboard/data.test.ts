import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPrismaClient } from "@/lib/db/prisma";

import {
  getDashboardActionRequest,
  listDashboardActionRequests,
} from "./data";

vi.mock("@/lib/db/prisma", () => ({
  getPrismaClient: vi.fn(),
}));

describe("dashboard data access", () => {
  beforeEach(() => {
    vi.mocked(getPrismaClient).mockReset();
  });

  it("lists action requests only for the provided organization", async () => {
    const prisma = createPrisma();
    vi.mocked(getPrismaClient).mockResolvedValue(prisma as never);

    await listDashboardActionRequests({
      organizationId: "org_demo",
    });

    expect(prisma.actionRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_demo",
        },
      }),
    );
  });

  it("loads detail by id and organizationId to avoid cross-org disclosure", async () => {
    const prisma = createPrisma({
      actionRequestDetail: null,
    });
    vi.mocked(getPrismaClient).mockResolvedValue(prisma as never);

    const record = await getDashboardActionRequest({
      actionRequestId: "ar_other_org",
      organizationId: "org_demo",
    });

    expect(record).toBeNull();
    expect(prisma.actionRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "ar_other_org",
          organizationId: "org_demo",
        },
      }),
    );
    expect(prisma.stripePaymentObject.findFirst).not.toHaveBeenCalled();
    expect(prisma.stripeWebhookEvent.findFirst).not.toHaveBeenCalled();
  });
});

function createPrisma({
  actionRequestList = [],
  actionRequestDetail = null,
}: {
  actionRequestList?: unknown[];
  actionRequestDetail?: unknown;
} = {}): MockDashboardPrisma {
  return {
    actionRequest: {
      findMany: vi.fn(async () => actionRequestList),
      findFirst: vi.fn(async () => actionRequestDetail),
    },
    stripePaymentObject: {
      findFirst: vi.fn(),
    },
    stripeWebhookEvent: {
      findFirst: vi.fn(),
    },
  };
}

type MockDashboardPrisma = {
  actionRequest: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  stripePaymentObject: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  stripeWebhookEvent: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};
