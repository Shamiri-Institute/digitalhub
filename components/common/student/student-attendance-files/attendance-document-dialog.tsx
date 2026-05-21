"use client";

import { type ImplementerRole } from "@prisma/client";
import { format } from "date-fns";
import type { Dispatch, SetStateAction } from "react";
import { SessionDetail } from "#/components/common/session/session-list";
import type { Session } from "#/components/common/session/sessions-provider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import UploadStudentAttendanceDocument from "#/components/common/student/student-attendance-files/upload-student-attendance";
import ViewAttendanceDocument from "#/components/common/student/student-attendance-files/view-attendance-document";

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
  if (!session || !groupId) return null;

  const group = session.school?.interventionGroups?.find((g) => g.id === groupId);
  const schoolName = session.school?.schoolName;
  const fellowName = group?.leader?.fellowName ?? undefined;
  const groupName = group?.groupName;
  const sessionDate = format(session.sessionDate, "yyyy-MM-dd");
  const sessionType = session.session?.sessionName ?? session.sessionType ?? undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attendance Document</DialogTitle>
        </DialogHeader>
        <div className="pb-2 pt-4">
          <SessionDetail state={{ session }} layout="compact" withDropdown={false} role={role} />
        </div>
        <Tabs defaultValue="upload">
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1">
              Upload
            </TabsTrigger>
            <TabsTrigger value="view" className="flex-1">
              View
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
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
          </TabsContent>
          <TabsContent value="view">
            <div className="h-[500px] overflow-hidden">
              <ViewAttendanceDocument sessionId={session.id} groupId={groupId} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
