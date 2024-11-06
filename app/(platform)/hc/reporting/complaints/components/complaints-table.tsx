"use client";
import DataTable from "#/components/data-table";

import { HubReportComplaintsType } from "#/app/(platform)/hc/reporting/complaints/actions";
import {
  columns,
  subColumns,
} from "#/app/(platform)/hc/reporting/complaints/components/columns";
import HCComplaintsFilterTab from "#/app/(platform)/hc/reporting/complaints/components/complaints-filter";

export default function HCComplaintsDataTable({
  complaints,
}: {
  complaints: HubReportComplaintsType[];
}) {
  return (
    <div className="container w-full grow space-y-3">
      <HCComplaintsFilterTab />
      <DataTable
        data={complaints}
        columns={columns}
        className="data-table data-table-action mt-4 bg-white"
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
