import { describe, expect, it } from "vitest";

import {
  buildDryRunExecutionRequest,
  buildExecutionFlowRefundRequest,
} from "./smoke-execution-flow";

describe("execution flow smoke test helpers", () => {
  it("builds a reviewable refund action request for execution", () => {
    expect(buildExecutionFlowRefundRequest("first")).toEqual({
      connector: "stripe_test",
      action: "refund.create",
      resource: {
        refund_id: "execution_flow_refund_first",
      },
      parameters: {
        amount: 100,
        currency: "USD",
      },
      context: {
        source: "local_e2e_execution_flow",
      },
    });
  });

  it("builds a dry-run execution request with metadata", () => {
    expect(
      buildDryRunExecutionRequest({
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
});
