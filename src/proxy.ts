import { NextResponse, type NextRequest } from "next/server";

import { getAuthConfig } from "./lib/auth/config";
import {
  DEMO_ACCESS_COOKIE_NAME,
  getDemoAccessConfig,
  isValidDemoAccessCookieValue,
} from "./lib/demo-access";

export default async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(
    "x-refundhold-current-path",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  try {
    const authConfig = getAuthConfig(process.env);

    if (authConfig.authRequired) {
      return NextResponse.next({ request: { headers } });
    }
  } catch {
    return NextResponse.json(
      {
        error: "failed_closed",
        message: "Authentication configuration is invalid.",
      },
      { status: 503 },
    );
  }

  const demoAccess = getDemoAccessConfig(process.env);

  if (!demoAccess.enabled) {
    return NextResponse.next({ request: { headers } });
  }

  if (demoAccess.password) {
    const cookieValue =
      request.cookies.get(DEMO_ACCESS_COOKIE_NAME)?.value ?? null;

    if (await isValidDemoAccessCookieValue(cookieValue, demoAccess.password)) {
      return NextResponse.next({ request: { headers } });
    }
  }

  const redirectUrl = new URL("/demo-access", request.url);
  redirectUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/app/:path*"],
};
