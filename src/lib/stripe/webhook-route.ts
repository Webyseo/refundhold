import { env as processEnv } from "node:process";

import Stripe from "stripe";

import {
  getStripeSafetyConfig,
  type StripeSafetyEnv,
} from "./config";
import type {
  StripeWebhookEvent,
  StripeWebhookProcessingResult,
} from "./webhooks";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

type JsonObject = {
  [key: string]: JsonValue;
};

export type StripeWebhookConstructEvent = (
  rawBody: string,
  signature: string,
  secret: string,
) => StripeWebhookEvent;

export type StripeWebhookProcessor = (input: {
  event: StripeWebhookEvent;
  rawBody: string;
}) => Promise<StripeWebhookProcessingResult>;

export type HandleStripeWebhookRequestResponse = {
  status: number;
  body: JsonObject;
};

export async function handleStripeWebhookRequest({
  request,
  env = processEnv,
  constructEvent = constructStripeWebhookEvent,
  processEvent,
}: {
  request: Request;
  env?: StripeSafetyEnv;
  constructEvent?: StripeWebhookConstructEvent;
  processEvent: StripeWebhookProcessor;
}): Promise<HandleStripeWebhookRequestResponse> {
  const configResult = readStripeWebhookConfig(env);

  if (!configResult.ok) {
    return configResult.response;
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return {
      status: 400,
      body: {
        error: "invalid_signature",
        message: "Stripe-Signature header is required.",
      },
    };
  }

  const rawBody = await request.text();
  let event: StripeWebhookEvent;

  try {
    event = constructEvent(rawBody, signature, configResult.secret);
  } catch {
    return {
      status: 400,
      body: {
        error: "invalid_signature",
        message: "Stripe webhook signature verification failed.",
      },
    };
  }

  try {
    const result = await processEvent({
      event,
      rawBody,
    });

    return {
      status: 200,
      body: {
        received: true,
        outcome: result.outcome,
        stripe_event_id: result.stripeEventId,
      },
    };
  } catch {
    return {
      status: 500,
      body: {
        error: "webhook_processing_failed",
        message: "Stripe webhook processing failed.",
      },
    };
  }
}

function constructStripeWebhookEvent(
  rawBody: string,
  signature: string,
  secret: string,
): StripeWebhookEvent {
  return Stripe.webhooks.constructEvent(
    rawBody,
    signature,
    secret,
  ) as StripeWebhookEvent;
}

function readStripeWebhookConfig(
  env: StripeSafetyEnv,
):
  | {
      ok: true;
      secret: string;
    }
  | {
      ok: false;
      response: HandleStripeWebhookRequestResponse;
    } {
  try {
    const config = getStripeSafetyConfig(env);

    if (!config.webhooksEnabled) {
      return {
        ok: false,
        response: {
          status: 503,
          body: {
            error: "webhook_disabled",
            message: "Stripe webhooks are disabled.",
          },
        },
      };
    }

    if (!config.webhookTestSecret) {
      return {
        ok: false,
        response: {
          status: 503,
          body: {
            error: "webhook_disabled",
            message: "Stripe webhook configuration is invalid.",
          },
        },
      };
    }

    return {
      ok: true,
      secret: config.webhookTestSecret,
    };
  } catch {
    return {
      ok: false,
      response: {
        status: 503,
        body: {
          error: "webhook_disabled",
          message: "Stripe webhook configuration is invalid.",
        },
      },
    };
  }
}
