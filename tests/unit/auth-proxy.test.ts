// @vitest-environment node
import { pathToRegexp } from "next/dist/compiled/path-to-regexp";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import proxy, { config } from "#/proxy";

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: cookie ? { cookie } : {},
  });
}

describe("proxy", () => {
  it("redirects to /login with the requested path when no session cookie is present", () => {
    const res = proxy(request("/hc/schools"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fhc%2Fschools");
  });

  it("redirects the root to /login without a next param", () => {
    expect(proxy(request("/")).headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("lets a request with a cookie through without touching the database", () => {
    // The proxy runs where the database is unreachable (see proxy.ts). A database call would
    // have to be awaited, so a synchronous response is the proof that none is made.
    const res = proxy(request("/hc/schools", "better-auth.session_token=abc"));
    expect(res).not.toBeInstanceOf(Promise);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("reads the secure-prefixed cookie when the site is served over https", () => {
    const res = proxy(request("/sc/schedule", "__Secure-better-auth.session_token=abc"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("leaves the public paths open", () => {
    for (const path of ["/login", "/register"]) {
      expect(proxy(request(path)).headers.get("x-middleware-next")).toBe("1");
    }
  });
});

describe("matcher", () => {
  const matcher = pathToRegexp(config.matcher[0] ?? "");

  it("skips API routes, Vercel telemetry and the Sentry tunnel", () => {
    for (const path of [
      "/api/s3/presigned",
      "/_vercel/speed-insights/vitals",
      "/monitoring",
      "/_next/static/chunk.js",
    ]) {
      expect(matcher.test(path)).toBe(false);
    }
  });

  it("covers pages, including paths that merely contain 'monitoring'", () => {
    for (const path of ["/", "/login", "/hc/schools", "/hc/reporting/monitoring-and-evaluation"]) {
      expect(matcher.test(path)).toBe(true);
    }
  });
});
