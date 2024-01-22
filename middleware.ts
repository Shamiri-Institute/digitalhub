import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import AppMiddleware from "#/lib/middleware/app";
import { ImplementerRole } from "@prisma/client";

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

const roleRouteMap = {
  [ImplementerRole.HUB_COORDINATOR]: "hc",
  [ImplementerRole.OPERATIONS]: "ops",
  [ImplementerRole.ADMIN]: "admin",
};

export enum AuthErrors {
  NO_MEMBERSHIPS = "no_memberships",
  NO_ROLE = "no_role",
  NO_ACCESS = "no_access",
}

function hasAccessToRoute(role: ImplementerRole, routeGroup: string) {
  if (role === ImplementerRole.ADMIN) {
    return true;
  }

  // Allow supervisors to access non-hc and non-ops to avoid massive code diff
  if (role === ImplementerRole.SUPERVISOR) {
    return routeGroup !== "hc" && routeGroup !== "ops";
  }

  return roleRouteMap[role] === routeGroup;
}

export default async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // TODO: token.memberships could have multiple entries, show implementer chooser and store that in the session
  // For now, we will just use the first one
  if (token && isNotSentryRequest(request)) {
    const { memberships } = token;
    if (!memberships || memberships.length === 0) {
      return redirectToLogin(request, AuthErrors.NO_MEMBERSHIPS);
    }

    const membership = memberships[0];
    const { role } = membership;
    if (!role) {
      return redirectToLogin(request, AuthErrors.NO_ROLE);
    }

    // "/hc".split("/")[1] => ["", "hc"][1] === "hc"
    const roleRouteGroup = request.nextUrl.pathname.split("/")[1] || "";
    console.log({});
    if (!hasAccessToRoute(role, roleRouteGroup)) {
      // If trying to access home page just redirect them to role-specific home page
      if (role === ImplementerRole.OPERATIONS && roleRouteGroup === "") {
        const redirectUrl = new URL("/ops", request.url);
        return NextResponse.redirect(redirectUrl);
      }

      if (role === ImplementerRole.HUB_COORDINATOR && roleRouteGroup === "") {
        const redirectUrl = new URL("/hc", request.url);
        return NextResponse.redirect(redirectUrl);
      }

      console.log({ role: membership.role, roleRouteGroup });

      return redirectToLogin(request, `not_${roleRouteGroup}`);
    }

    return AppMiddleware(request);
  }

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
