import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildRefundRequestPayload,
  refundSmokeCases,
  runRefundRequestSmokeTest,
} from "./smoke-action-request";

describe("refund request smoke test helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("defines the three demo refund policy outcomes in public language", () => {
    expect(refundSmokeCases).toEqual([
      {
        amountUsd: 25,
        expectedDecision: "allowed",
      },
      {
        amountUsd: 100,
        expectedDecision: "needs_review",
      },
      {
        amountUsd: 750,
        expectedDecision: "blocked",
      },
    ]);
  });

  it("builds the public refund-request payload shape", () => {
    expect(buildRefundRequestPayload(25)).toEqual({
      stripe_mode: "demo_simulation",
      amount: 2500,
      currency: "usd",
      reason: "AI support agent recommends a $25.00 refund.",
    });
  });

  it("posts to the public refund-request endpoint and logs public wording", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { amount: number };
      const id = `rr_${body.amount}`;
      const decision =
        body.amount === 2500
          ? "allowed"
          : body.amount === 10000
            ? "needs_review"
            : "blocked";

      return Response.json(
        {
          refund_request_id: id,
          decision,
          reason: "Refund request evaluated by demo policy.",
          review_url: `/app/refund-requests/${id}`,
        },
        { status: 201 },
      );
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", fetchMock);

    await runRefundRequestSmokeTest({
      baseUrl: "http://localhost:3000",
      apiKey: "ar_demo_prefix_secret",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const call of fetchMock.mock.calls) {
      expect(call[0]).toBe("http://localhost:3000/api/v1/refund-requests");
      expect(call[0]).not.toContain("/api/v1/action-requests");
    }

    const output = logSpy.mock.calls.flat().join("\n");
    expect(output).toContain("Demo simulation does not move money.");
    expect(output).toContain("25 USD refund request -> allowed (rr_2500)");
    expect(output).toContain("100 USD refund request -> needs_review (rr_10000)");
    expect(output).toContain("750 USD refund request -> blocked (rr_75000)");
    expect(output).not.toContain("action request");
    expect(output).not.toContain("ActionRequest");
    expect(output).not.toContain("action_request_id");
    expect(output).not.toContain("dry run");
    expect(output).not.toContain("dry_run");
    expect(output).not.toContain("connector");
    expect(output).not.toContain("live Stripe refund");
  });
});
