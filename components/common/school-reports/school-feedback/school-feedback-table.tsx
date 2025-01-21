"use client";
import { SchoolFeedbackType } from "#/app/(platform)/sc/reporting/school-reports/school-feedback/action";
import DataTable from "#/components/data-table";

import { columns } from "./columns";

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
        className="data-table data-table-action mt-4 bg-white"
        emptyStateMessage="No feedback data found"
      />
    </div>
  );
}
