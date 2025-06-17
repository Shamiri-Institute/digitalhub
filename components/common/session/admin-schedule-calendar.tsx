"use client";

import {
  fetchImplementerFellowRatings,
  fetchImplementerSessionTypes,
  fetchImplementerSupervisors,
  ImplementerFellowRating,
  ImplementerSupervisor,
} from "#/lib/actions/implementer";
import { ImplementerRole, Prisma } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { ScheduleCalendar } from "./schedule-calendar";

export function AdminScheduleCalendar() {
  const { data: session } = useSession();
  const implementerId = session?.user?.activeMembership?.implementerId;
  const role = session?.user?.activeMembership?.role;
  const [hubSessionTypes, setHubSessionTypes] = useState<
    Prisma.SessionNameGetPayload<{}>[]
  >([]);
  const [supervisors, setSupervisors] = useState<ImplementerSupervisor[]>([]);
  const [fellowRatings, setFellowRatings] = useState<ImplementerFellowRating[]>([]);

  useEffect(() => {
    const fetchSessionTypes = async () => {
      if (!implementerId || !role) return;

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
  }, [implementerId, role]);

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
