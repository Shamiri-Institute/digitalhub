"use client";
import type { SchoolFeedbackType } from "#/app/(platform)/sc/reporting/school-reports/school-feedback/action";
import ExpandableReportTable from "#/components/common/expandable-report-table";

import { columns, subColumns } from "./columns";

export default function SchoolFeedbackDataTable({ feedback }: { feedback: SchoolFeedbackType[] }) {
  return (
    <ExpandableReportTable
      data={feedback}
      columns={columns}
      subColumns={subColumns}
      getSubRows={(row) => row.supervisorRatings}
      emptyStateMessage="No feedback data found"
      subEmptyStateMessage="No feedback found for this school"
    />
  );
}
