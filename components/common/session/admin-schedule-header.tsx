"use client";

import { Separator } from "#/components/ui/separator";
import { ScheduleHeader } from "./schedule-header";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { fetchImplementerStats } from "#/lib/actions/implementer";
import { toast } from "#/components/ui/use-toast";

interface ImplementerStats {
  hub_count: number;
  school_count: number;
  student_count: number;
}

export function AdminScheduleHeader() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<ImplementerStats>({
    hub_count: 0,
    school_count: 0,
    student_count: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const implementerId = session?.user?.activeMembership?.implementerId;
    if (!implementerId) return;

    const loadStats = async () => {
      try {
        const data = await fetchImplementerStats(implementerId);
        if (data.success) {
          setStats(data.data || { hub_count: 0, school_count: 0, student_count: 0 });
        } else {
          toast({
            description: data.message,
            variant: "destructive",
          }); 
        }
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [session]);

  return (
    <>
      <ScheduleHeader
        loading={loading}
        stats={[
          {
            title: "Hubs",
            count: stats.hub_count,
          },
          {
            title: "Schools",
            count: stats.school_count,
          },
          {
            title: "Students",
            count: stats.student_count,
          },
        ]}
      />
    </>
  );
} 