import { ChevronsUpDown } from "lucide-react";
import type * as React from "react";

import type { AdminProject } from "#/app/(platform)/layout";
import { Button } from "#/components/ui/button";
import type { ImplementerPersonnel } from "#/lib/actions/fetch-personnel";
import type { SessionUser } from "#/lib/auth/session-user";
import { cn } from "#/lib/utils";

// The switchers' triggers, kept apart from their popovers so the header can draw them before
// the popovers' code has loaded.
function switcherTrigger(label: React.ReactNode, disabled: boolean, wide = false) {
  return (
    <Button
      variant="outline"
      className={cn(
        "w-full justify-between bg-white px-2 text-left disabled:pointer-events-none disabled:grayscale",
        wide ? "lg:min-w-[300px]" : "min-w-[200px]",
      )}
      disabled={disabled}
    >
      <span className="truncate text-base font-medium">{label}</span>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );
}

export function projectSwitcherTrigger(
  user: SessionUser | null,
  projects: AdminProject[],
  loading: boolean,
) {
  const activeProject = projects.find((project) => project.id === user?.activeProjectId);
  return switcherTrigger(
    loading ? "Loading..." : (activeProject?.name ?? "Select project..."),
    loading,
  );
}

export function roleSwitcherTrigger(
  user: SessionUser | null,
  implementerMembers: ImplementerPersonnel,
  loading: boolean,
) {
  const activeMembership = user?.activeMembership ?? null;
  const activeLabel = implementerMembers.personnel.find(
    (member) => member.id === implementerMembers.activePersonnelId,
  )?.label;
  return switcherTrigger(
    activeMembership ? (
      <span className="flex flex-row items-baseline gap-3">
        <span className="font-medium">{activeLabel}</span>
        <span className="text-xs uppercase tracking-widest text-primary">
          {" - "}
          {activeMembership.role.replace("_", " ")}
        </span>
      </span>
    ) : (
      "Select member"
    ),
    loading || !activeMembership,
    true,
  );
}

export function membershipSwitcherTrigger(user: SessionUser | null, loading: boolean) {
  const activeMembership = user?.activeMembership ?? null;
  return switcherTrigger(
    activeMembership ? activeMembership.implementerName : "Select implementer...",
    loading || !activeMembership,
  );
}
