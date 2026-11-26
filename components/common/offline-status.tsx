"use client";

import { useOffline } from "next/offline";
import { useEffect } from "react";
import { toast } from "#/components/ui/use-toast";
import { sendQueuedStudentAttendance } from "#/lib/offline/student-attendance-outbox";

export function OfflineStatus() {
  const isOffline = useOffline();

  // effect: sends the attendance marks that a closed or killed tab left queued on this phone.
  useEffect(() => {
    sendQueuedStudentAttendance()
      .then((unsaved) => {
        for (const answer of unsaved) {
          toast({
            variant: "destructive",
            description:
              answer.outcome === "superseded"
                ? "An attendance mark saved on this phone was older than one already saved, so it was not sent."
                : answer.message,
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!isOffline) return null;
  return (
    <output className="border-shamiri-light-orange/30 bg-shamiri-light-orange/10 text-shamiri-dark-orange block border-b px-4 py-2 text-sm">
      You are offline. Attendance you mark is kept on this phone and sent when the connection
      returns.
    </output>
  );
}
