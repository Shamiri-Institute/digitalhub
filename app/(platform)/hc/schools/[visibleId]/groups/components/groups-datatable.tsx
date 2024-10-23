"use client";

import {
  columns,
  SchoolGroupDataTableData,
} from "#/app/(platform)/hc/schools/[visibleId]/groups/components/columns";
import DataTable from "#/components/data-table";
import { useState } from "react";

export default function GroupsDataTable({
  data,
}: {
  data: SchoolGroupDataTableData[];
}) {
  const [group, setGroup] = useState<SchoolGroupDataTableData>();
  return (
    <DataTable
      columns={columns({ setGroup })}
      data={data}
      className={"data-table data-table-action mt-4"}
      columnVisibilityState={{ "Active Status": false }}
      emptyStateMessage={"No groups associated with this school"}
    />
  );
}
