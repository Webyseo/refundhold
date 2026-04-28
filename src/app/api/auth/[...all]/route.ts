import { getBetterAuthOrNull } from "../../../../lib/auth/auth";
import { AuthConfigError, getAuthConfig, type AuthEnv } from "../../../../lib/auth/config";

export type AuthRouteAuth = {
  handler: (request: Request) => Response | Promise<Response>;
};

export const runtime = "nodejs";

type AuthRouteOptions = {
  env?: AuthEnv;
  getAuth?: (env: AuthEnv) => Promise<AuthRouteAuth | null>;
};

export async function GET(request: Request): Promise<Response> {
  return handleAuthRouteRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleAuthRouteRequest(request);
}

export async function handleAuthRouteRequest(
  request: Request,
  options: AuthRouteOptions = {},
): Promise<Response> {
  const env = options.env ?? process.env;
  const getAuth = options.getAuth ?? getBetterAuthOrNull;

  try {
    const config = getAuthConfig(env);

    if (!config.authEnabled) {
      return Response.json(
        {
          error: "auth_disabled",
          message: "Authentication is not enabled.",
        },
        {
          status: 404,
        },
      );
    }

    const auth = await getAuth(env);

    if (!auth) {
      return unavailableResponse();
    }

    return auth.handler(request);
  } catch (error) {
    if (error instanceof AuthConfigError || error instanceof Error) {
      return unavailableResponse();
    }

    throw error;
  }
}

function unavailableResponse(): Response {
  return Response.json(
    {
      error: "auth_unavailable",
      message: "Authentication is not available.",
    },
    {
      status: 503,
    },
  );
}
