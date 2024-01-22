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
  if (role === ImplementerRole.SUPERVISOR) {
    return routeGroup !== "hc" && routeGroup !== "ops";
  }

  return roleRouteMap[role] === routeGroup;
}

function redirectTo(url: string, request: NextRequest, error: AuthErrors) {
  const redirectUrl = new URL(url, request.url);
  redirectUrl.searchParams.append("error", error);
  return NextResponse.redirect(redirectUrl);
}

export default async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  if (
    request.nextUrl.pathname === "/login" ||
    !token ||
    request.nextUrl.pathname.startsWith("/monitoring") // Sentry
  ) {
    return AppMiddleware(request);
  }

  const { memberships } = token;
  if (!memberships || memberships.length === 0) {
    return redirectTo("/login", request, AuthErrors.NO_MEMBERSHIPS);
  }

  const { role } = memberships[0];
  if (!role) {
    return redirectTo("/login", request, AuthErrors.NO_ROLE);
  }

  const routeGroup = request.nextUrl.pathname.split("/")[1] || "";
  if (!hasAccessToRoute(role, routeGroup)) {
    switch (role) {
      case ImplementerRole.OPERATIONS:
        return redirectTo("/ops", request, AuthErrors.NO_ACCESS);
      case ImplementerRole.HUB_COORDINATOR:
        return redirectTo("/hc", request, AuthErrors.NO_ACCESS);
      case ImplementerRole.SUPERVISOR:
        return redirectTo("/", request, AuthErrors.NO_ACCESS);
    }
  }

  return AppMiddleware(request);
}
