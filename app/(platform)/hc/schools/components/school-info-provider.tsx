"use client";
import { SchoolsTableData } from "#/app/(platform)/hc/schools/components/columns";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
import { useState } from "react";

export default function SchoolInfoProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [editDialog, setEditDialog] = useState(false);
  const [pointSupervisorDialog, setPointSupervisorDialog] = useState(false);
  const [schoolDropOutDialog, setSchoolDropOutDialog] = useState(false);
  const [undoDropOutDialog, setUndoDropOutDialog] = useState(false);
  const [school, setSchool] = useState<SchoolsTableData | null>(null);
  return (
    <SchoolInfoContext.Provider
      value={{
        school,
        setSchool,
        editDialog,
        setEditDialog,
        pointSupervisorDialog,
        setPointSupervisorDialog,
        schoolDropOutDialog,
        setSchoolDropOutDialog,
        undoDropOutDialog,
        setUndoDropOutDialog,
      }}
    >
      {children}
    </SchoolInfoContext.Provider>
  );
}
