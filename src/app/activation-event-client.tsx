"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";

import type {
  ActivationEventMetadata,
  ActivationEventName,
} from "@/lib/activation-events";

const sessionStorageKey = "refundhold_activation_session_id";

type ActivationEventViewProps = {
  eventName: ActivationEventName;
  metadata?: ActivationEventMetadata;
};

type ActivationEventLinkProps = ComponentProps<typeof Link> & {
  eventName: ActivationEventName;
  metadata?: ActivationEventMetadata;
};

export function ActivationEventView({
  eventName,
  metadata,
}: ActivationEventViewProps) {
  useEffect(() => {
    trackActivationEvent(eventName, metadata);
  }, [eventName, metadata]);

  return null;
}

export function ActivationEventLink({
  eventName,
  metadata,
  onClick,
  ...props
}: ActivationEventLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackActivationEvent(eventName, metadata);
        onClick?.(event);
      }}
    />
  );
}

export function CopyCurlButton({
  command,
  eventName,
  metadata,
}: {
  command: string;
  eventName: ActivationEventName;
  metadata?: ActivationEventMetadata;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      setStatus("copied");
      trackActivationEvent(eventName, metadata);
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        className="inline-flex items-center justify-center rounded-md bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
        onClick={copyCommand}
        type="button"
      >
        Copy curl
      </button>
      <p className="text-sm text-zinc-400" role="status">
        {status === "copied"
          ? "Copied"
          : status === "failed"
            ? "Copy failed"
            : "No live Stripe money moves."}
      </p>
    </div>
  );
}

export function trackActivationEvent(
  eventName: ActivationEventName,
  metadata: ActivationEventMetadata = {},
) {
  if (typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify({
    eventName,
    sessionId: getActivationSessionId(),
    metadata: {
      route: window.location.pathname,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  });

  try {
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(
        "/api/activation-events",
        new Blob([body], {
          type: "application/json",
        }),
      );

      if (sent) {
        return;
      }
    }

    void fetch("/api/activation-events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Activation tracking must never interrupt the public product flow.
  }
}

function getActivationSessionId(): string | null {
  try {
    const existing = window.sessionStorage.getItem(sessionStorageKey);

    if (existing) {
      return existing;
    }

    const nextSessionId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    window.sessionStorage.setItem(sessionStorageKey, nextSessionId);

    return nextSessionId;
  } catch {
    return null;
  }
}
