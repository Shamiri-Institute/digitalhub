"use client";
import { SchoolsTableData } from "#/app/(platform)/hc/schools/components/columns";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
import { useState } from "react";

export default function SchoolInfoProvider({
  children,
  school,
}: {
  children: React.ReactNode;
  school?: SchoolsTableData;
}) {
  const [editDialog, setEditDialog] = useState(false);
  const [pointSupervisorDialog, setPointSupervisorDialog] = useState(false);
  const [schoolDropOutDialog, setSchoolDropOutDialog] = useState(false);
  const [undoDropOutDialog, setUndoDropOutDialog] = useState(false);
  const [_school, setSchool] = useState<SchoolsTableData | null>(
    school ?? null,
  );
  return (
    <SchoolInfoContext.Provider
      value={{
        school: _school,
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
