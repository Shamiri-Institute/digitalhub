"use client";

import { type ImplementerRole } from "@prisma/client";
import { format } from "date-fns";
import type { Dispatch, SetStateAction } from "react";
import UploadStudentAttendanceDocument from "#/components/common/student/student-attendance-files/upload-student-attendance";
import { SessionDetail } from "#/components/common/session/session-list";
import type { Session } from "#/components/common/session/sessions-provider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";

export default function UploadAttendanceDocumentDialog({
  session,
  groupId,
  role,
  open,
  onOpenChange,
  children,
}: {
  session?: Session | null;
  groupId?: string;
  role: ImplementerRole;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  children?: React.ReactNode;
}) {
  if (!session || !groupId) return null;

  const group = session.school?.interventionGroups?.find((g) => g.id === groupId);
  const schoolName = session.school?.schoolName;
  const fellowName = group?.leader?.fellowName ?? undefined;
  const groupName = group?.groupName;
  const sessionDate = format(session.sessionDate, "yyyy-MM-dd");
  const sessionType = session.session?.sessionName ?? session.sessionType ?? undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Attendance Document</DialogTitle>
        </DialogHeader>
        <div className="pb-2 pt-4">
          <SessionDetail state={{ session }} layout={"compact"} withDropdown={false} role={role} />
        </div>
        <UploadStudentAttendanceDocument
          groupId={groupId}
          sessionId={session.id}
          schoolName={schoolName}
          fellowName={fellowName}
          groupName={groupName}
          sessionDate={sessionDate}
          sessionType={sessionType}
          onClose={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}
