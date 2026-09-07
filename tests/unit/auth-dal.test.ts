// @vitest-environment node
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { currentHubCoordinator, currentSupervisorLite } from "#/app/auth";
import { getCachedSession } from "#/lib/auth-options";
import { db } from "#/lib/db";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
  }),
}));
vi.mock("#/lib/auth-options", () => ({ getCachedSession: vi.fn() }));
vi.mock("#/lib/active-project-id", () => ({ getActiveProjectId: vi.fn() }));
vi.mock("#/lib/db", () => ({
  db: {
    hubCoordinator: { findFirst: vi.fn() },
    supervisor: { findFirst: vi.fn() },
    session: { deleteMany: vi.fn() },
  },
}));

const session = vi.mocked(getCachedSession);

function signedInAs(role: string, identifier = "id_1") {
  session.mockResolvedValue({
    user: { id: "user_1", activeMembership: { role, identifier } },
  } as never);
}

describe("role helpers", () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear();
    vi.mocked(db.hubCoordinator.findFirst).mockResolvedValue({ id: "hc_1" } as never);
  });

  it("sends another role to its own home before touching the data", async () => {
    signedInAs("SUPERVISOR");
    await expect(currentHubCoordinator()).rejects.toThrow("redirect:/sc");
    expect(db.hubCoordinator.findFirst).not.toHaveBeenCalled();
  });

  it("loads the profile for the matching role", async () => {
    signedInAs("HUB_COORDINATOR");
    await expect(currentHubCoordinator()).resolves.toMatchObject({ profile: { id: "hc_1" } });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns null without a session", async () => {
    session.mockResolvedValue(null);
    await expect(currentSupervisorLite()).resolves.toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });
});
