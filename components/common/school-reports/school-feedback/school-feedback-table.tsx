"use client";
import type { SchoolFeedbackType } from "#/app/(platform)/sc/reporting/school-reports/school-feedback/action";
import DataTable from "#/components/data-table";

import { columns, subColumns } from "./columns";

export default function SchoolFeedbackDataTable({
  feedback,
}: {
  feedback: SchoolFeedbackType[];
}) {
  return (
    <div className="container w-full grow space-y-3">
      <DataTable
        data={feedback}
        columns={columns}
        className="data-table data-table-action bg-white lg:mt-4"
        emptyStateMessage="No feedback data found"
        renderSubComponent={({ row }) => (
          <DataTable
            data={row.original?.supervisorRatings}
            editColumns={false}
            columns={subColumns}
            className="data-table data-table-action border-0 bg-white"
            emptyStateMessage="No feedback found for this school"
            disablePagination={true}
            disableSearch={true}
          />
        )}
      />
    </div>
  );
}
