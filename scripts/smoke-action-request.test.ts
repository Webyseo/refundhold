import { describe, expect, it } from "vitest";

import {
  buildRefundActionRequestPayload,
  refundSmokeCases,
} from "./smoke-action-request";

describe("action request smoke test payloads", () => {
  it("defines the three demo refund policy outcomes", () => {
    expect(refundSmokeCases).toEqual([
      {
        amount: 25,
        expectedDecision: "allow",
      },
      {
        amount: 100,
        expectedDecision: "approval_required",
      },
      {
        amount: 750,
        expectedDecision: "deny",
      },
    ]);
  });

  it("builds the real action-request payload shape", () => {
    expect(buildRefundActionRequestPayload(25)).toEqual({
      connector: "stripe_test",
      action: "refund.create",
      resource: {
        refund_id: "smoke_refund_25",
      },
      parameters: {
        amount: 25,
        currency: "EUR",
      },
      context: {
        source: "local_e2e_smoke",
      },
    });
  });
});
