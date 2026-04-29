import { POST as postActionRequestRejection } from "../../../action-requests/[id]/reject/route";
import { toRefundRequestJsonResponse } from "../../refund-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await postActionRequestRejection(request, {
    params: Promise.resolve({ id }),
  });

  return toRefundRequestJsonResponse({
    action: "reject",
    fallbackId: id,
    response,
  });
}
