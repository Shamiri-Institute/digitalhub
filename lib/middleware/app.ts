import { ImplementerRole } from "@prisma/client";
import { addBreadcrumb } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getToken, type JWT } from "next-auth/jwt";

import { parse } from "#/lib/middleware/utils";

export default async function AppMiddleware(req: NextRequest) {
  const { path } = parse(req);
  const session = await getToken({ req });

  // If accessing login page and not authenticated, allow access
  if (path === "/login" && !session?.email) {
    return NextResponse.next();
  }

  // Check if authenticated and accessing authorized route
  if (!session?.email && path !== "/login" && path !== "/register") {
    console.warn("No email in session", {
      session,
      pathname: req.nextUrl.pathname,
    });
    return NextResponse.redirect(
      new URL(`/login${path !== "/" ? `?next=${encodeURIComponent(path)}` : ""}`, req.url),
    );
  }
  if (session?.email && path !== "/login") {
    // Check for valid membership only when not on login page
    if (!session.activeMembership?.role) {
      console.warn("No valid membership found for user", {
        email: session.email,
        pathname: req.nextUrl.pathname,
      });

      // Log the error for monitoring
      addBreadcrumb({
        category: "auth",
        message: "No valid membership found",
        level: "warning",
        data: {
          email: session.email,
          path: path,
        },
      });

      // Clear session cookies
      const response = NextResponse.redirect(new URL("/login", req.url));
      const cookiesToClear = [
        "next-auth.session-token",
        "next-auth.callback-url",
        "next-auth.csrf-token",
        "__Secure-next-auth.session-token",
        "__Secure-next-auth.callback-url",
        "__Secure-next-auth.csrf-token",
        "session",
      ];

      cookiesToClear.forEach((cookie) => {
        response.cookies.delete(cookie);
      });

      // Add error message
      response.headers.set("x-middleware-cache", "no-cache");
      return response;
    }

    if (path === "/login") {
      if (ifHcUserAndUnprefixedPath(session, path)) {
        return NextResponse.redirect(new URL("/hc", req.url));
      }

      if (ifSupervisorUserAndUnprefixedPath(session, path)) {
        return NextResponse.redirect(new URL("/sc", req.url));
      }

      if (ifFellowUserAndUnprefixedPath(session, path)) {
        return NextResponse.redirect(new URL("/fel", req.url));
      }

      if (ifClinicalLeadUserAndUnprefixedPath(session, path)) {
        return NextResponse.redirect(new URL("/cl", req.url));
      }

      if (ifOpsUserAndUnprefixedPath(session, path)) {
        return NextResponse.redirect(new URL("/ops", req.url));
      }

      if (ifClinicalTeamUserAndUnprefixedPath(session, path)) {
        return NextResponse.redirect(new URL("/ct", req.url));
      }

      if (ifAdminUserAndUnprefixedPath(session, path)) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }

      return NextResponse.redirect(new URL("/", req.url));
    }

    if (ifHcUserAndUnprefixedPath(session, path)) {
      return NextResponse.redirect(new URL("/hc", req.url));
    }
    if (ifSupervisorUserAndUnprefixedPath(session, path)) {
      return NextResponse.redirect(new URL("/sc", req.url));
    }
    if (ifFellowUserAndUnprefixedPath(session, path)) {
      return NextResponse.redirect(new URL("/fel", req.url));
    }
    if (ifClinicalLeadUserAndUnprefixedPath(session, path)) {
      return NextResponse.redirect(new URL("/cl", req.url));
    }
    if (ifOpsUserAndUnprefixedPath(session, path)) {
      return NextResponse.redirect(new URL("/ops", req.url));
    }
    if (ifClinicalTeamUserAndUnprefixedPath(session, path)) {
      return NextResponse.redirect(new URL("/ct", req.url));
    }
    if (ifSupervisorAndHcRoute(session, path)) {
      return NextResponse.redirect(new URL("/", req.url));
    } else if (ifAdminUserAndUnprefixedPath(session, path)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return NextResponse.next();
}

function ifHcUserAndUnprefixedPath(session: JWT | null, path: string) {
  return (
    session?.activeMembership?.role === ImplementerRole.HUB_COORDINATOR && !path.startsWith("/hc")
  );
}

function ifSupervisorUserAndUnprefixedPath(session: JWT | null, path: string) {
  return session?.activeMembership?.role === ImplementerRole.SUPERVISOR && !path.startsWith("/sc");
}

function ifFellowUserAndUnprefixedPath(session: JWT | null, path: string) {
  return session?.activeMembership?.role === ImplementerRole.FELLOW && !path.startsWith("/fel");
}

function ifSupervisorAndHcRoute(session: JWT | null, path: string) {
  return session?.activeMembership?.role === ImplementerRole.SUPERVISOR && path.startsWith("/hc");
}

function ifClinicalLeadUserAndUnprefixedPath(session: JWT | null, path: string) {
  return (
    session?.activeMembership?.role === ImplementerRole.CLINICAL_LEAD && !path.startsWith("/cl")
  );
}

function ifOpsUserAndUnprefixedPath(session: JWT | null, path: string) {
  return session?.activeMembership?.role === ImplementerRole.OPERATIONS && !path.startsWith("/ops");
}

function ifClinicalTeamUserAndUnprefixedPath(session: JWT | null, path: string) {
  return (
    session?.activeMembership?.role === ImplementerRole.CLINICAL_TEAM && !path.startsWith("/ct")
  );
}

function ifAdminUserAndUnprefixedPath(session: JWT | null, path: string) {
  return (
    session?.activeMembership?.role === ImplementerRole.ADMIN &&
    !path.startsWith("/admin")
  );
}
