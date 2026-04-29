import { createActionRequestResponse } from "./create-action-request-response";

export async function POST(request: Request) {
  const response = await createActionRequestResponse({ request });

  return Response.json(response.body, {
    status: response.status,
  });
}
