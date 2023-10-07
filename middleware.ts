import { NextFetchEvent, NextRequest } from "next/server";

import { APP_HOSTNAMES } from "#/lib/constants";
import { parse } from "#/lib/middleware/utils";
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

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { domain, path, fullPath, key } = parse(req);

  if (APP_HOSTNAMES.has(domain)) {
    return AppMiddleware(req);
  }
}
