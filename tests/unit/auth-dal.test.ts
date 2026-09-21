// @vitest-environment node
import { redirect } from "next/navigation";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { currentHubCoordinator, currentSupervisorLite } from "#/app/auth";
import { db, pool } from "#/db/client";
import { getCachedSession } from "#/lib/auth-options";

// The request context (cookies → next-auth session) is the only thing stubbed; the loaders
// below run against the seeded local database.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
  }),
}));
vi.mock("#/lib/auth-options", () => ({ getCachedSession: vi.fn() }));

const session = vi.mocked(getCachedSession);

function signedInAs(role: string, identifier = "id_1") {
  session.mockResolvedValue({
    user: { id: "user_1", activeMembership: { role, identifier } },
  } as never);
}

afterAll(() => pool.end());

describe("role helpers", () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear();
  });

  it("sends another role to its own home before touching the data", async () => {
    signedInAs("SUPERVISOR");
    await expect(currentHubCoordinator()).rejects.toThrow("redirect:/sc");
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  it("loads the profile and assigned hub for a hub coordinator", async () => {
    const seeded = await db.query.hubCoordinator.findFirst({
      where: (hc, { isNotNull }) => isNotNull(hc.assignedHubId),
      columns: { id: true, assignedHubId: true },
    });
    if (!seeded) throw new Error("seed the database first: no hub coordinator with a hub");

    signedInAs("HUB_COORDINATOR", seeded.id);
    const result = await currentHubCoordinator();
    expect(result?.profile.id).toBe(seeded.id);
    expect(result?.profile.assignedHub?.id).toBe(seeded.assignedHubId);
    expect(Array.isArray(result?.profile.assignedHub?.schools)).toBe(true);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("loads the lite supervisor profile with its hub's project", async () => {
    const seeded = await db.query.supervisor.findFirst({
      where: (s, { isNotNull }) => isNotNull(s.hubId),
      columns: { id: true, hubId: true },
    });
    if (!seeded) throw new Error("seed the database first: no supervisor with a hub");

    signedInAs("SUPERVISOR", seeded.id);
    const result = await currentSupervisorLite();
    expect(result?.profile).toMatchObject({ id: seeded.id, hubId: seeded.hubId });
    expect(typeof result?.profile.hub?.projectId).toBe("string");
  });

  it("returns null without a session", async () => {
    session.mockResolvedValue(null);
    await expect(currentSupervisorLite()).resolves.toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });
});
