import { z } from "zod";

const healthResponseSchema = z.object({
  service: z.literal("refundhold"),
  status: z.literal("ok"),
});

export function GET() {
  return Response.json(
    healthResponseSchema.parse({
      service: "refundhold",
      status: "ok",
    }),
  );
}
