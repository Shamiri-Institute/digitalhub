// @vitest-environment node
import { pathToRegexp } from "next/dist/compiled/path-to-regexp";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sessionCookie } from "#/lib/auth/session";
import { loadSessionUser } from "#/lib/auth/session-user";
import { db } from "#/lib/db";
import proxy, { config } from "#/proxy";

vi.mock("#/lib/db", () => ({ db: { session: { findUnique: vi.fn(), deleteMany: vi.fn() } } }));
vi.mock("#/lib/auth/session-user", () => ({ loadSessionUser: vi.fn() }));

const findUnique = vi.mocked(db.session.findUnique);
const deleteMany = vi.mocked(db.session.deleteMany);
const loadUser = vi.mocked(loadSessionUser);
const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000);
const oneHourAgo = () => new Date(Date.now() - 60 * 60 * 1000);
const original = { NEXTAUTH_URL: process.env.NEXTAUTH_URL, VERCEL_URL: process.env.VERCEL_URL };

function request(path: string, cookie?: string, extra: Record<string, string> = {}) {
  const headers = cookie ? { cookie, ...extra } : extra;
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

function liveSession(userId = "user_1") {
  findUnique.mockResolvedValue({ expires: inOneHour(), user: { id: userId } } as never);
}

function activeRole(role: string | undefined) {
  loadUser.mockResolvedValue(
    role ? ({ id: "user_1", activeMembership: { role } } as never) : ({ id: "user_1" } as never),
  );
}

afterEach(() => {
  process.env.NEXTAUTH_URL = original.NEXTAUTH_URL;
  process.env.VERCEL_URL = original.VERCEL_URL;
});

describe("proxy", () => {
  beforeEach(() => {
    findUnique.mockReset();
    deleteMany.mockReset();
    loadUser.mockReset();
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  });

  it("redirects to /login with the requested path when no session cookie is present", async () => {
    const res = await proxy(request("/hc/schools"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fhc%2Fschools");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("lets a prefetch through on cookie presence alone, without touching the database", async () => {
    const res = await proxy(
      request("/hc/schools", "next-auth.session-token=abc", { "next-router-prefetch": "1" }),
    );
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("lets a navigation through when the session is live and the path is under the role's home", async () => {
    liveSession();
    activeRole("HUB_COORDINATOR");
    const res = await proxy(request("/hc/schools", "next-auth.session-token=abc"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(findUnique).toHaveBeenCalledWith({
      where: { sessionToken: "abc" },
      include: { user: true },
    });
  });

  it("redirects another role's route, and the root, to the active role's home", async () => {
    liveSession();
    activeRole("HUB_COORDINATOR");
    for (const path of ["/sc/schedule", "/"]) {
      const res = await proxy(request(path, "next-auth.session-token=abc"));
      expect(res.headers.get("location")).toBe("http://localhost:3000/hc");
    }
  });

  it("reads the secure-prefixed cookie when the site is served over https", async () => {
    process.env.NEXTAUTH_URL = "https://hub.example.org";
    liveSession();
    activeRole("SUPERVISOR");
    const res = await proxy(request("/sc/schedule", "__Secure-next-auth.session-token=abc"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("rejects a cookie with no session row and clears it", async () => {
    findUnique.mockResolvedValue(null);
    const res = await proxy(request("/hc/schools", "next-auth.session-token=forged"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fhc%2Fschools");
    expect(res.headers.get("set-cookie")).toContain("next-auth.session-token=;");
  });

  it("rejects an expired session row", async () => {
    findUnique.mockResolvedValue({ expires: oneHourAgo(), user: { id: "user_1" } } as never);
    const res = await proxy(request("/hc/schools", "next-auth.session-token=old"));
    expect(res.status).toBe(307);
  });

  it("ends the sessions of a user with no active membership", async () => {
    liveSession();
    activeRole(undefined);
    const res = await proxy(request("/hc/schools", "next-auth.session-token=abc"));
    expect(res.headers.get("location")).toContain("/login?error=");
    expect(res.headers.get("set-cookie")).toContain("next-auth.session-token=;");
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: "user_1" } });
  });

  it("leaves the public paths open without touching the database", async () => {
    for (const path of ["/login", "/register"]) {
      const res = await proxy(request(path));
      expect(res.headers.get("x-middleware-next")).toBe("1");
    }
    expect(findUnique).not.toHaveBeenCalled();
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
