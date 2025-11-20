"use client";

import {
  fetchImplementerFellowRatings,
  fetchImplementerSessionTypes,
  fetchImplementerSupervisors,
  ImplementerFellowRating,
  ImplementerSupervisor,
} from "#/lib/actions/implementer";
import { ImplementerRole, type Prisma } from "@prisma/client";
import { useEffect, useState } from "react";
import { ScheduleCalendar } from "./schedule-calendar";
import type { CurrentAdminUser } from "#/app/auth";

export function AdminScheduleCalendar({ adminUser }: { adminUser: CurrentAdminUser }) {
  const implementerId = adminUser?.session.user.activeMembership?.implementerId;
  const role = adminUser?.session.user.activeMembership?.role;
  const [hubSessionTypes, setHubSessionTypes] = useState<Prisma.SessionNameGetPayload<{}>[]>([]);
  const [supervisors, setSupervisors] = useState<ImplementerSupervisor[]>([]);
  const [fellowRatings, setFellowRatings] = useState<ImplementerFellowRating[]>([]);

  useEffect(() => {
    const fetchSessionTypes = async () => {
      if (!implementerId || !role || adminUser === null) return;

      const response = await Promise.all([
        fetchImplementerSessionTypes(implementerId),
        fetchImplementerSupervisors(implementerId),
        fetchImplementerFellowRatings(implementerId),
      ]);
      setHubSessionTypes(response[0].data || []);
      setSupervisors(response[1].data || []);
      setFellowRatings(response[2].data || []);
    };

    fetchSessionTypes();
  }, [implementerId, role, adminUser]);

  return (
    <ScheduleCalendar
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
