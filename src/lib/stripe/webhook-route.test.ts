import { describe, expect, it, vi } from "vitest";

import {
  handleStripeWebhookRequest,
  type StripeWebhookConstructEvent,
  type StripeWebhookProcessor,
} from "./webhook-route";

const enabledWebhookEnv = {
  AUTHRAIL_STRIPE_WEBHOOKS_ENABLED: "true",
  AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET: "whsec_unit_fixture",
};

describe("handleStripeWebhookRequest", () => {
  it("does not verify or process when webhooks are disabled", async () => {
    const constructEvent = vi.fn<StripeWebhookConstructEvent>();
    const processEvent = vi.fn<StripeWebhookProcessor>();

    const response = await handleStripeWebhookRequest({
      request: createRequest({
        body: rawBodyFixture,
        signature: "t=1,v1=test",
      }),
      env: {},
      constructEvent,
      processEvent,
    });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: "webhook_disabled",
      message: "Stripe webhooks are disabled.",
    });
    expect(constructEvent).not.toHaveBeenCalled();
    expect(processEvent).not.toHaveBeenCalled();
  });

  it("rejects missing Stripe-Signature", async () => {
    const response = await handleStripeWebhookRequest({
      request: createRequest({
        body: rawBodyFixture,
      }),
      env: enabledWebhookEnv,
      constructEvent: vi.fn<StripeWebhookConstructEvent>(),
      processEvent: vi.fn<StripeWebhookProcessor>(),
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "invalid_signature",
      message: "Stripe-Signature header is required.",
    });
  });

  it("rejects invalid signatures without exposing the webhook secret", async () => {
    const secret = "whsec_unit_fixture";
    const constructEvent = vi.fn<StripeWebhookConstructEvent>(() => {
      throw new Error(`bad signature for ${secret}`);
    });

    const response = await handleStripeWebhookRequest({
      request: createRequest({
        body: rawBodyFixture,
        signature: "t=1,v1=invalid",
      }),
      env: {
        AUTHRAIL_STRIPE_WEBHOOKS_ENABLED: "true",
        AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET: secret,
      },
      constructEvent,
      processEvent: vi.fn<StripeWebhookProcessor>(),
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "invalid_signature",
      message: "Stripe webhook signature verification failed.",
    });
    expect(JSON.stringify(response.body)).not.toContain(secret);
  });

  it("uses the raw body for signature verification and processing", async () => {
    const rawBody = "not-json-but-signed";
    const event = createEvent();
    const constructEvent = vi.fn<StripeWebhookConstructEvent>(() => event);
    const processEvent = vi.fn<StripeWebhookProcessor>(async () => {
      return {
        outcome: "processed",
        stripeEventId: "evt_test",
      };
    });

    const response = await handleStripeWebhookRequest({
      request: createRequest({
        body: rawBody,
        signature: "t=1,v1=valid",
      }),
      env: enabledWebhookEnv,
      constructEvent,
      processEvent,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      received: true,
      outcome: "processed",
      stripe_event_id: "evt_test",
    });
    expect(constructEvent).toHaveBeenCalledWith(
      rawBody,
      "t=1,v1=valid",
      "whsec_unit_fixture",
    );
    expect(processEvent).toHaveBeenCalledWith({
      event,
      rawBody,
    });
  });

  it("returns 200 for duplicate events", async () => {
    const response = await handleStripeWebhookRequest({
      request: createRequest({
        body: rawBodyFixture,
        signature: "t=1,v1=valid",
      }),
      env: enabledWebhookEnv,
      constructEvent: vi.fn<StripeWebhookConstructEvent>(() => createEvent()),
      processEvent: vi.fn<StripeWebhookProcessor>(async () => {
        return {
          outcome: "duplicate",
          stripeEventId: "evt_test",
        };
      }),
    });

    expect(response.status).toBe(200);
    expect(response.body.outcome).toBe("duplicate");
  });
});

const rawBodyFixture = JSON.stringify({
  id: "evt_test",
  type: "refund.created",
});

function createRequest({
  body,
  signature,
}: {
  body: string;
  signature?: string;
}): Request {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: signature
      ? {
          "Stripe-Signature": signature,
        }
      : undefined,
    body,
  });
}

function createEvent() {
  return {
    id: "evt_test",
    type: "refund.created",
    livemode: false,
    created: 1_776_000_500,
    data: {
      object: {
        object: "refund",
        id: "re_test",
        amount: 100,
        currency: "usd",
        status: "pending",
        livemode: false,
        created: 1_776_000_400,
      },
    },
  };
}
