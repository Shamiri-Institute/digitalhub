"use client";

import { type ImplementerRole } from "@prisma/client";
import { format } from "date-fns";
import type { Dispatch, SetStateAction } from "react";
import UploadStudentAttendanceDocument from "#/components/common/schools/upload-student-attendance";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import type { Session } from "#/components/common/session/sessions-provider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { sessionDisplayName } from "#/lib/utils";

export default function UploadAttendanceDocumentDialog({
  session,
  groupId,
  role: _role,
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

  const groupName =
    session.school?.interventionGroups?.find((g) => g.id === groupId)?.groupName ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Attendance Document</DialogTitle>
        </DialogHeader>
        <div className="pb-2 pt-4">
          <DialogAlertWidget separator={true}>
            <div className="flex flex-col gap-1">
              <span>
                <span className="font-medium">Session: </span>
                {sessionDisplayName(session.session?.sessionName)}
              </span>
              <span>
                <span className="font-medium">Date: </span>
                {format(session.sessionDate, "dd MMM yyyy")}
              </span>
              {groupName && (
                <span>
                  <span className="font-medium">Group: </span>
                  {groupName}
                </span>
              )}
              {session.school?.schoolName && (
                <span>
                  <span className="font-medium">School: </span>
                  {session.school.schoolName}
                </span>
              )}
            </div>
          </DialogAlertWidget>
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
