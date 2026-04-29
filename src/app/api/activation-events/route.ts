import { parseActivationEventPayload } from "../../../lib/activation-events";

export async function POST(request: Request) {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return Response.json(
      {
        error: "invalid_payload",
        message: "Activation event body is invalid.",
      },
      {
        status: 400,
      },
    );
  }

  const parsed = parseActivationEventPayload(input);

  if (!parsed.ok) {
    return Response.json(
      {
        error: parsed.reason,
        message:
          parsed.reason === "unknown_event"
            ? "Unknown activation event."
            : "Activation event body is invalid.",
      },
      {
        status: 400,
      },
    );
  }

  console.info("refundhold.activation_event", {
    event_name: parsed.payload.eventName,
    metadata: parsed.payload.metadata,
    session_id: parsed.payload.sessionId,
  });

  return Response.json({
    ok: true,
  });
}
