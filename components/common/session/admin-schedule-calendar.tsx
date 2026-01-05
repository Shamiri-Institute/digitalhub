"use client";

import { ImplementerRole, type SessionName } from "@prisma/client";
import { useEffect, useState } from "react";
import type { CurrentAdminUser } from "#/app/auth";
import {
  fetchImplementerFellowRatings,
  fetchImplementerSessionTypes,
  fetchImplementerSupervisors,
  type ImplementerFellowRating,
  type ImplementerSupervisor,
} from "#/lib/actions/implementer";
import { ScheduleCalendar } from "./schedule-calendar";

export function AdminScheduleCalendar({ adminUser }: { adminUser: CurrentAdminUser }) {
  const implementerId = adminUser?.session.user.activeMembership?.implementerId;
  const role = adminUser?.session.user.activeMembership?.role;
  const [hubSessionTypes, setHubSessionTypes] = useState<SessionName[]>([]);
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
