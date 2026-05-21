"use client";

import { type ImplementerRole } from "@prisma/client";
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
          onClose={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}
