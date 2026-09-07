// @vitest-environment node
import { pathToRegexp } from "next/dist/compiled/path-to-regexp";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sessionCookie } from "#/lib/auth/session";
import { db } from "#/lib/db";
import proxy, { config } from "#/proxy";

vi.mock("#/lib/db", () => ({ db: { session: { findUnique: vi.fn(), deleteMany: vi.fn() } } }));

const findUnique = vi.mocked(db.session.findUnique);
const original = { NEXTAUTH_URL: process.env.NEXTAUTH_URL, VERCEL_URL: process.env.VERCEL_URL };

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: cookie ? { cookie } : {},
  });
}

afterEach(() => {
  process.env.NEXTAUTH_URL = original.NEXTAUTH_URL;
  process.env.VERCEL_URL = original.VERCEL_URL;
});

describe("proxy", () => {
  beforeEach(() => {
    findUnique.mockReset();
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  });

  it("redirects to /login with the requested path when no session cookie is present", () => {
    const res = proxy(request("/hc/schools"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fhc%2Fschools");
  });

  it("redirects the root to /login without a next param", () => {
    expect(proxy(request("/")).headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("lets a request with a cookie through without touching the database", () => {
    const res = proxy(request("/hc/schools", "next-auth.session-token=abc"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("reads the secure-prefixed cookie when the site is served over https", () => {
    process.env.NEXTAUTH_URL = "https://hub.example.org";
    const res = proxy(request("/sc/schedule", "__Secure-next-auth.session-token=abc"));
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

describe("sessionCookie", () => {
  it("uses the plain name over http", () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    expect(sessionCookie()).toMatchObject({
      name: "next-auth.session-token",
      options: { secure: false },
    });
  });

  it("uses the secure-prefixed name over https", () => {
    process.env.NEXTAUTH_URL = "https://hub.example.org";
    expect(sessionCookie()).toMatchObject({
      name: "__Secure-next-auth.session-token",
      options: { secure: true },
    });
  });

  it("treats a Vercel deployment without NEXTAUTH_URL as https", () => {
    delete process.env.NEXTAUTH_URL;
    process.env.VERCEL_URL = "digitalhub-abc.vercel.app";
    expect(sessionCookie().name).toBe("__Secure-next-auth.session-token");
  });
});
