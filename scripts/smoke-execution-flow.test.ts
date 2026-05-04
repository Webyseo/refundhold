import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildDemoSimulationExecutionRequest,
  buildExecutionFlowRefundRequest,
  runExecutionFlowSmokeTest,
} from "./smoke-execution-flow";

describe("execution flow smoke test helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("builds a reviewable public refund request for execution", () => {
    expect(buildExecutionFlowRefundRequest("first")).toEqual({
      stripe_mode: "demo_simulation",
      amount: 10000,
      currency: "usd",
      reason: "AI support agent recommends a test refund for execution flow first.",
    });
  });

  it("builds a demo simulation execution request with metadata", () => {
    expect(
      buildDemoSimulationExecutionRequest({
        source: "unit_test",
      }),
    ).toEqual({
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        metadata: {
          source: "unit_test",
        },
      }),
    });
  });

  it("uses public refund-request endpoints and reports demo execution", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://localhost:3000/api/v1/refund-requests") {
        return Response.json(
          {
            refund_request_id: "rr_execute",
            decision: "needs_review",
            reason: "Human approval required for refunds between $50 and $500",
            review_url: "/app/refund-requests/rr_execute",
          },
          { status: 201 },
        );
      }

      if (url.endsWith("/approve")) {
        return Response.json(
          {
            refund_request_id: "rr_execute",
            status: "approved",
            decision: "approved",
            outcome: "approved",
            review_url: "/app/refund-requests/rr_execute",
            message: "Refund approved.",
          },
          { status: 200 },
        );
      }

      if (fetchMock.mock.calls.filter((call) => String(call[0]).endsWith("/execute")).length === 1) {
        return Response.json(
          {
            refund_request_id: "rr_execute",
            status: "executed",
            outcome: "executed",
            review_url: "/app/refund-requests/rr_execute",
            message: "Demo execution recorded.",
          },
          { status: 200 },
        );
      }

      return Response.json(
        {
          error: "already_executed",
          refund_request_id: "rr_execute",
          message: "Refund request has already executed.",
        },
        { status: 409 },
      );
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", fetchMock);

    await runExecutionFlowSmokeTest({
      baseUrl: "http://localhost:3000",
      apiKey: "ar_demo_prefix_secret",
      reviewerEmail: "demo.reviewer@refundhold.com",
    });

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "http://localhost:3000/api/v1/refund-requests",
      "http://localhost:3000/api/v1/refund-requests/rr_execute/approve",
      "http://localhost:3000/api/v1/refund-requests/rr_execute/execute",
      "http://localhost:3000/api/v1/refund-requests/rr_execute/execute",
    ]);

    const output = logSpy.mock.calls.flat().join("\n");
    expect(output).toContain("Demo execution recorded.");
    expect(output).toContain("execute refund request rr_execute -> executed");
    expect(output).not.toContain("/api/v1/action-requests");
    expect(output).not.toContain("action request");
    expect(output).not.toContain("action_request_id");
    expect(output).not.toContain("dry run");
    expect(output).not.toContain("dry_run");
    expect(output).not.toContain("connector");
    expect(output).not.toContain("live Stripe refund");
  });
});
