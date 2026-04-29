import { POST as postActionRequestApproval } from "../../../action-requests/[id]/approve/route";
import { toRefundRequestJsonResponse } from "../../refund-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await postActionRequestApproval(request, {
    params: Promise.resolve({ id }),
  });

  return toRefundRequestJsonResponse({
    action: "approve",
    fallbackId: id,
    response,
  });
}
