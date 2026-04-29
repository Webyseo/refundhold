import { POST as postActionRequestExecution } from "../../../action-requests/[id]/execute/route";
import { toRefundRequestJsonResponse } from "../../refund-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await postActionRequestExecution(request, {
    params: Promise.resolve({ id }),
  });

  return toRefundRequestJsonResponse({
    action: "execute",
    fallbackId: id,
    response,
  });
}
