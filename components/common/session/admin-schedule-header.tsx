"use client";

import { toast } from "#/components/ui/use-toast";
import { fetchImplementerStats } from "#/lib/actions/implementer";
import { useEffect, useState } from "react";
import { ScheduleHeader } from "./schedule-header";
import type { CurrentAdminUser } from "#/app/auth";

interface ImplementerStats {
  hub_count: number;
  school_count: number;
  student_count: number;
}

export function AdminScheduleHeader({ adminUser }: { adminUser: CurrentAdminUser }) {
  const [stats, setStats] = useState<ImplementerStats>({
    hub_count: 0,
    school_count: 0,
    student_count: 0,
  });
  const [loading, setLoading] = useState(adminUser === null);

  useEffect(() => {
    const implementerId = adminUser?.session.user.activeMembership?.implementerId;
    if (!implementerId || adminUser === null) return;

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
  }, [adminUser]);

  return (
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
  );
}
