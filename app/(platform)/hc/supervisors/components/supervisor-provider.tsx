"use client";
import { SupervisorsData } from "#/app/(platform)/hc/supervisors/components/columns";
import { SupervisorContext } from "#/app/(platform)/hc/supervisors/context/supervisor-context";
import { useState } from "react";

export default function SupervisorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dropoutDialog, setDropoutDialog] = useState<boolean>(false);
  const [editDialog, setEditDialog] = useState<boolean>(false);
  const [undropDialog, setUndropDialog] = useState<boolean>(false);
  const [complaintDialog, setComplaintDialog] = useState<boolean>(false);
  const [evaluationDialog, setEvaluationDialog] = useState<boolean>(false);
  const [supervisor, setSupervisor] = useState<SupervisorsData | null>(null);

  return (
    <SupervisorContext.Provider
      value={{
        editDialog,
        setEditDialog,
        complaintDialog,
        setComplaintDialog,
        evaluationDialog,
        setEvaluationDialog,
        dropoutDialog,
        setDropoutDialog,
        undropDialog,
        setUndropDialog,
        supervisor,
        setSupervisor,
      }}
    >
      {children}
    </SupervisorContext.Provider>
  );
}
