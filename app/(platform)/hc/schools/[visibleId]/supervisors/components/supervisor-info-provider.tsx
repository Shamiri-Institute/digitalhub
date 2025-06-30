"use client";
import type { SupervisorsData } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/columns";
import { SupervisorInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/context/supervisor-info-context";
import { useState } from "react";

export default function SupervisorInfoProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [attendanceDialog, setAttendanceDialog] = useState<boolean>(false);
  const [dropoutDialog, setDropoutDialog] = useState<boolean>(false);
  const [undropDialog, setUndropDialog] = useState<boolean>(false);
  const [supervisor, setSupervisor] = useState<SupervisorsData | null>(null);

  return (
    <SupervisorInfoContext.Provider
      value={{
        dropoutDialog,
        setDropoutDialog,
        undropDialog,
        setUndropDialog,
        attendanceDialog,
        setAttendanceDialog,
        supervisor,
        setSupervisor,
      }}
    >
      {children}
    </SupervisorInfoContext.Provider>
  );
}
