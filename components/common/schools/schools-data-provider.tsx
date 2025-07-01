"use client";
import type React from "react";
import { useState } from "react";
import { SchoolsDataContext } from "#/app/(platform)/hc/schools/context/schools-data-context";
import type { SchoolsTableData } from "#/components/common/schools/columns";

export default function SchoolsDataProvider({
  children,
  schools,
}: {
  children: React.ReactNode;
  schools: SchoolsTableData[];
}) {
  const [filteredSchools, setFilteredSchools] = useState(schools);

  return (
    <SchoolsDataContext.Provider
      value={{
        schools: filteredSchools,
        setSchools: setFilteredSchools,
      }}
    >
      {children}
    </SchoolsDataContext.Provider>
  );
}
