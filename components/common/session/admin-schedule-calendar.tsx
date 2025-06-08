"use client";

import { ScheduleCalendar } from "./schedule-calendar";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Prisma } from "@prisma/client";
import { fetchImplementerSessionTypes } from "#/lib/actions/implementer";
import { toast } from "#/components/ui/use-toast";

export function AdminScheduleCalendar() {
  const { data: session } = useSession();
  const implementerId = session?.user?.activeMembership?.implementerId;
  const [hubSessionTypes, setHubSessionTypes] = useState<Prisma.SessionNameGetPayload<{}>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessionTypes = async () => {
      if (!implementerId) return;
      
      const result = await fetchImplementerSessionTypes(implementerId);
      if (result.success) {
        setHubSessionTypes(result.data || []);
      } else {
        toast({
          description: result.message,
          variant: "destructive",
        });
      }
      setLoading(false);
    };

    fetchSessionTypes();
  }, [implementerId]);

  return (
    <ScheduleCalendar
      implementerId={implementerId}
      aria-label="Session schedule"
      schools={[]}
      supervisors={[]}
      fellowRatings={[]}
      role={"ADMIN"}
      hubSessionTypes={hubSessionTypes}
    />
  );
} 