"use client";
import DataTable from "#/components/data-table";

import { HubReportComplaintsType } from "#/app/(platform)/hc/reporting/expenses/complaints/actions";
import {
  columns,
  subColumns,
} from "#/components/common/expenses/complaints/columns";
import FellowComplaintsFilterTab from "#/components/common/expenses/complaints/complaints-filter";

export default function FellowComplaintsDataTable({
  complaints,
}: {
  complaints: HubReportComplaintsType[];
}) {
  return (
    <div className="container w-full grow space-y-3">
      <FellowComplaintsFilterTab />
      <DataTable
        data={complaints}
        columns={columns}
        className="data-table data-table-action bg-white lg:mt-4"
        emptyStateMessage="No complaints found"
        renderSubComponent={({ row }) => (
          <DataTable
            data={row.original?.complaints}
            editColumns={false}
            columns={subColumns}
            className="data-table data-table-action border-0 bg-white"
            emptyStateMessage="No complaints found for this fellow"
          />
        )}
      />
    </div>
  );
}
