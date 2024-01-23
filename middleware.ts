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

function redirectTo(url: string, request: NextRequest, error?: AuthErrors) {
  const redirectUrl = new URL(url, request.url);
  if (error) {
    redirectUrl.searchParams.append("error", error);
    console.error(
      `Redirecting to ${redirectUrl.toString()} with error ${error}`,
      request.nextUrl.pathname,
    );
  }
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

  const { role } = memberships[0] || {};
  if (!role) {
    return redirectTo("/login", request, AuthErrors.NO_ROLE);
  }

  const routeGroup = request.nextUrl.pathname.split("/")[1] || "";
  if (!hasAccessToRoute(role, routeGroup)) {
    const redirectMap: Record<ImplementerRole, string> = {
      [ImplementerRole.OPERATIONS]: "/ops",
      [ImplementerRole.HUB_COORDINATOR]: "/hc",
      [ImplementerRole.SUPERVISOR]: "/",
      [ImplementerRole.ADMIN]: "/admin",
    };

    const redirectUrl = redirectMap[role];
    const error =
      request.nextUrl.searchParams.get("login") === "1"
        ? undefined
        : AuthErrors.NO_ACCESS;

    return redirectTo(redirectUrl, request, error);
  }

  return AppMiddleware(request);
}
