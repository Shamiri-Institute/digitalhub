"use client";

import type { ImplementerRole } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useState } from "react";
import { SessionDetail } from "#/components/common/session/session-list";
import type { Session } from "#/components/common/session/sessions-provider";
import UploadStudentAttendanceDocument from "#/components/common/student/student-attendance-files/upload-student-attendance";
import ViewAttendanceDocument from "#/components/common/student/student-attendance-files/view-attendance-document";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";

export default function AttendanceDocumentDialog({
  session,
  groupId,
  role,
  open,
  onOpenChange,
}: {
  session: Session | null;
  groupId?: string;
  role: ImplementerRole;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);
  if (!session || !groupId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden">
        <DialogHeader>
          <DialogTitle>Attendance Document</DialogTitle>
          <DialogDescription>
            View or upload attendance documents for this session.
          </DialogDescription>
        </DialogHeader>
        <div className="pb-1 pt-2">
          <SessionDetail state={{ session }} layout="compact" withDropdown={false} role={role} />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 rounded-full bg-shamiri-new-blue" />
              <h3 className="text-sm font-semibold text-shamiri-text-dark-grey">View Document</h3>
            </div>
            <ViewAttendanceDocument
              key={refreshKey}
              sessionId={session.id}
              groupId={groupId}
              role={role}
              onDeleteSuccess={handleRefresh}
            />
          </div>

          <div className="border-t border-shamiri-light-grey" />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 rounded-full bg-shamiri-green" />
              <h3 className="text-sm font-semibold text-shamiri-text-dark-grey">Upload Document</h3>
            </div>
            <UploadStudentAttendanceDocument
              groupId={groupId}
              sessionId={session.id}
              onClose={onOpenChange}
              onUploadSuccess={handleRefresh}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
