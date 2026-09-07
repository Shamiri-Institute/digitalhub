// @vitest-environment node

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformLayout from "#/app/(platform)/layout";
import { getCurrentPersonnel, getCurrentUserSession } from "#/app/auth";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
  }),
}));
vi.mock("#/app/auth", () => ({ getCurrentUserSession: vi.fn(), getCurrentPersonnel: vi.fn() }));
vi.mock("#/components/layout-client", () => ({ LayoutClient: () => null }));

const session = vi.mocked(getCurrentUserSession);
const personnel = vi.mocked(getCurrentPersonnel);
const headersMock = vi.mocked(headers);

function render(path: string, role?: string) {
  headersMock.mockResolvedValue(new Headers({ "x-pathname": path }) as never);
  session.mockResolvedValue(
    role ? ({ user: { activeMembership: { role } } } as never) : (null as never),
  );
  return PlatformLayout({ children: null });
}

describe("PlatformLayout", () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear();
    personnel.mockResolvedValue(null);
  });

  it("redirects to /login with the requested path when there is no session", async () => {
    await expect(render("/hc/schools")).rejects.toThrow("redirect:/login?next=%2Fhc%2Fschools");
  });

  it("redirects another role's route to the active role's home", async () => {
    await expect(render("/sc/schedule", "HUB_COORDINATOR")).rejects.toThrow("redirect:/hc");
  });

  it("renders when the path is under the role's home", async () => {
    await expect(render("/hc/schools", "HUB_COORDINATOR")).resolves.toBeTruthy();
    await expect(render("/hc", "HUB_COORDINATOR")).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
});
