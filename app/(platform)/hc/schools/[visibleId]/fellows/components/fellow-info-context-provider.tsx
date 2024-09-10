"use client";
import { SchoolFellowTableData } from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/columns";
import { FellowInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/fellows/context/fellow-info-context";
import { useState } from "react";

export default function FellowInfoContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [groupDialog, setGroupDialog] = useState(false);
  const [addStudentDialog, setAddStudentDialog] = useState(false);
  const [attendanceHistoryDialog, setAttendanceHistoryDialog] = useState(false);
  const [assignSupervisor, setAssignSupervisor] = useState(false);
  const [fellow, setFellow] = useState<SchoolFellowTableData | null>(null);

  return (
    <FellowInfoContext.Provider
      value={{
        assignSupervisor,
        setAssignSupervisor,
        groupDialog,
        setGroupDialog,
        addStudentDialog,
        setAddStudentDialog,
        attendanceHistoryDialog,
        setAttendanceHistoryDialog,
        fellow,
        setFellow,
      }}
    >
      {children}
    </FellowInfoContext.Provider>
  );
}
