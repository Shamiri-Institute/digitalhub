import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import AppMiddleware from "#/lib/middleware/app";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

export default async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  console.debug({ token });

  // TODO: token.memberships could have multiple entries, show implementer chooser and store that in the session
  // For now, we will just use the first one
  // if (token && isNotSentryRequest(request)) {
  //   console.debug({ token });
  //   const memberships = token.memberships;
  //   if (!memberships || memberships.length === 0) {
  //     return redirectToLogin(request, "no_implementer");
  //   }

  //   const membership = memberships[0];

  //   const roleRouteGroup = request.nextUrl.pathname.split("/")[0];

  //   console.debug({ prg: roleRouteGroup, role: membership.role });

  //   // Make sure the user is accessing the correct page
  //   if (
  //     roleRouteGroup === "hc" &&
  //     membership.role !== ImplementerRole.HUB_COORDINATOR
  //   ) {
  //     return redirectToLogin(request, "not_hc");
  //   } else if (
  //     roleRouteGroup === "ops" &&
  //     membership.role !== ImplementerRole.OPERATIONS
  //   ) {
  //     return redirectToLogin(request, "not_ops");
  //   } else if (
  //     membership.role === ImplementerRole.SUPERVISOR ||
  //     membership.role === ImplementerRole.ADMIN
  //   ) {
  //     return AppMiddleware(request);
  //   }
  // }

  return AppMiddleware(request);
}

function isNotSentryRequest(request: NextRequest) {
  return !request.nextUrl.pathname.startsWith("/monitoring");
}

function redirectToLogin(request: NextRequest, error: string) {
  const redirectUrl = new URL("/login", request.url);
  redirectUrl.searchParams.append("error", error);
  return NextResponse.redirect(redirectUrl);
}
