import { describe, expect, it, vi } from "vitest";

import { POST } from "./route";

describe("POST /api/activation-events", () => {
  it("accepts allowed activation events without auth", async () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    try {
      const response = await POST(
        createRequest({
          eventName: "demo_started",
          sessionId: "session_123",
          metadata: {
            route: "/demo",
            step: "proposal",
            timestamp: "2026-04-29T12:00:00.000Z",
          },
        }),
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        ok: true,
      });
      expect(consoleSpy).toHaveBeenCalledWith("refundhold.activation_event", {
        event_name: "demo_started",
        metadata: {
          route: "/demo",
          step: "proposal",
          timestamp: "2026-04-29T12:00:00.000Z",
        },
        session_id: "session_123",
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("rejects unknown activation events", async () => {
    const response = await POST(
      createRequest({
        eventName: "unexpected_event",
        metadata: {
          route: "/demo",
        },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "unknown_event",
      message: "Unknown activation event.",
    });
  });

  it("rejects invalid JSON", async () => {
    const response = await POST(createRequest("{"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_payload",
      message: "Activation event body is invalid.",
    });
  });
});

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/activation-events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
