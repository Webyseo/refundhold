import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../action-requests/create-action-request-response", () => {
  return {
    createActionRequestResponse: vi.fn(),
  };
});

import { createActionRequestResponse } from "../action-requests/create-action-request-response";

import { POST } from "./route";

const mockedCreateActionRequestResponse = vi.mocked(createActionRequestResponse);

describe("POST /api/v1/refund-requests", () => {
  beforeEach(() => {
    mockedCreateActionRequestResponse.mockReset();
  });

  it("accepts the public refund request payload and returns refund language", async () => {
    mockedCreateActionRequestResponse.mockResolvedValue({
      status: 201,
      body: {
        decision: "approval_required",
        action_request_id: "ar_123",
        reason:
          "approval_required policy matched: Review refunds from 50 USD to 500 USD",
        approval_url: "/app/refund-requests/ar_123",
      },
    });

    const response = await POST(
      createRequest({
        stripe_mode: "demo_simulation",
        amount: 42000,
        currency: "usd",
        reason: "AI support agent recommends refund",
      }),
    );

    expect(mockedCreateActionRequestResponse).toHaveBeenCalledWith({
      request: expect.any(Request),
      approvalUrlBasePath: "/app/refund-requests",
      body: {
        connector: "stripe_test",
        action: "refund.create",
        resource: {
          refund_id: "demo_refund_42000",
        },
        parameters: {
          amount: 420,
          currency: "USD",
        },
        context: {
          reason: "AI support agent recommends refund",
          source: "demo_simulation",
          stripe_mode: "demo_simulation",
        },
      },
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      refund_request_id: "ar_123",
      decision: "needs_review",
      reason: "Human approval required for refunds between $50 and $500",
      review_url: "/app/refund-requests/ar_123",
    });
  });

  it("keeps the compatibility request payload working through the alias", async () => {
    mockedCreateActionRequestResponse.mockResolvedValue({
      status: 201,
      body: {
        decision: "allow",
        action_request_id: "ar_456",
        reason: "allow policy matched: Allow refunds under 50 USD",
      },
    });

    const compatibilityPayload = {
      connector: "stripe_test",
      action: "refund.create",
      resource: {
        refund_id: "demo_refund_2500",
      },
      parameters: {
        amount: 25,
        currency: "USD",
      },
      context: {
        source: "demo_simulation",
      },
    };

    const response = await POST(createRequest(compatibilityPayload));

    expect(mockedCreateActionRequestResponse).toHaveBeenCalledWith({
      request: expect.any(Request),
      approvalUrlBasePath: "/app/refund-requests",
      body: compatibilityPayload,
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      refund_request_id: "ar_456",
      decision: "allowed",
      reason: "Refund allowed by policy.",
      review_url: "/app/refund-requests/ar_456",
    });
  });

  it("rejects invalid JSON without calling the creation handler", async () => {
    const response = await POST(createRequest("{"));

    expect(mockedCreateActionRequestResponse).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_payload",
      message: "Request body is invalid.",
    });
  });
});

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/v1/refund-requests", {
    method: "POST",
    headers: {
      authorization: "Bearer demo_key",
      "content-type": "application/json",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
