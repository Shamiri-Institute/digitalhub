"use client";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
import { SchoolsTableData } from "#/components/common/schools/columns";
import { useEffect, useState } from "react";

export default function SchoolInfoProvider({
  children,
  school,
}: {
  children: React.ReactNode;
  school?: SchoolsTableData | null;
}) {
  const [editDialog, setEditDialog] = useState(false);
  const [pointSupervisorDialog, setPointSupervisorDialog] = useState(false);
  const [schoolDropOutDialog, setSchoolDropOutDialog] = useState(false);
  const [undoDropOutDialog, setUndoDropOutDialog] = useState(false);
  const [_school, setSchool] = useState(school ?? null);

  useEffect(() => {
    setSchool(school ?? null);
  }, [school]);

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
