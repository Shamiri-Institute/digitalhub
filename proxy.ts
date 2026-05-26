import { type NextRequest, NextResponse } from "next/server";

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

export default async function proxy(request: NextRequest) {
  // ensure we allow /monitoring endpoint used by vercel and we bypass /<role>/reporting/monitoring-and-evaluation for other authenticated functions
  if (
    request.nextUrl.pathname.includes("monitoring") &&
    !request.nextUrl.pathname.includes("monitoring-and-evaluation")
  ) {
    return NextResponse.next();
  }

  return AppMiddleware(request);
}
