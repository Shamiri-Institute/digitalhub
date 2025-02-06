"use client";
import { SchoolsDataContext } from "#/app/(platform)/hc/schools/context/schools-data-context";
import { SchoolsTableData } from "#/components/common/schools/columns";
import React, { useState } from "react";

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
