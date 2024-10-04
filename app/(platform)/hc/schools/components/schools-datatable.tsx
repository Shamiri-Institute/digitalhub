"use client";

import { columns } from "#/app/(platform)/hc/schools/components/columns";
import { SchoolsDataContext } from "#/app/(platform)/hc/schools/context/schools-data-context";
import SchoolsDataTable from "#/components/data-table";
import { useContext } from "react";

export default function SchoolsDatatable() {
  const context = useContext(SchoolsDataContext);

  return (
    <SchoolsDataTable
      data={context.schools}
      columns={columns}
      emptyStateMessage="No schools found for this hub"
      className="data-table mt-4 bg-white"
      columnVisibilityState={{
        "School ID": false,
        "Sub - county": false,
        "Point teacher": false,
        "Point teacher phone no.": false,
        "Point teacher email": false,
        "Point supervisor phone no.": false,
        "Point supervisor email": false,
      }}
    />
  );
}
