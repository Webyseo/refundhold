import { z } from "zod";

const healthResponseSchema = z.object({
  service: z.literal("authrail"),
  status: z.literal("ok"),
});

export function GET() {
  return Response.json(
    healthResponseSchema.parse({
      service: "authrail",
      status: "ok",
    }),
  );
}
