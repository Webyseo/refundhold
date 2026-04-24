import { NextResponse, type NextRequest } from "next/server";

import {
  DEMO_ACCESS_COOKIE_NAME,
  getDemoAccessConfig,
  isValidDemoAccessCookieValue,
} from "@/lib/demo-access";

export default async function proxy(request: NextRequest) {
  const demoAccess = getDemoAccessConfig(process.env);

  if (!demoAccess.enabled) {
    return NextResponse.next();
  }

  if (demoAccess.password) {
    const cookieValue =
      request.cookies.get(DEMO_ACCESS_COOKIE_NAME)?.value ?? null;

    if (await isValidDemoAccessCookieValue(cookieValue, demoAccess.password)) {
      return NextResponse.next();
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
