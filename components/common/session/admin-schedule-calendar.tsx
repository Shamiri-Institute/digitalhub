"use client";

import { ImplementerRole } from "#/db/enums";
import { useSession } from "next-auth/react";
import type { CurrentAdminUser } from "#/app/auth";
import type { ImplementerFellowRating, ImplementerSupervisor } from "#/lib/actions/implementer";
import { ScheduleCalendar } from "./schedule-calendar";
import type { sessionName } from "#/db/schema";

export function AdminScheduleCalendar({
  adminUser,
  hubSessionTypes,
  supervisors,
  fellowRatings,
}: {
  adminUser: CurrentAdminUser;
  hubSessionTypes: (typeof sessionName.$inferSelect)[];
  supervisors: ImplementerSupervisor[];
  fellowRatings: ImplementerFellowRating[];
}) {
  const { data: session } = useSession();
  const implementerId = adminUser?.session.user.activeMembership?.implementerId;
  const role = adminUser?.session.user.activeMembership?.role;
  const activeProjectId = session?.user?.activeProjectId ?? null;

  return (
    <ScheduleCalendar
      activeProjectId={activeProjectId}
      implementerId={implementerId}
      aria-label="Session schedule"
      schools={[]}
      supervisors={supervisors}
      fellowRatings={fellowRatings}
      role={role ?? ImplementerRole.ADMIN}
      hubSessionTypes={hubSessionTypes}
    />
  );
}
