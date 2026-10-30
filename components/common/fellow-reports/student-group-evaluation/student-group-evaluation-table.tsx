"use client";

import ExpandableReportTable from "#/components/common/expandable-report-table";
import type { StudentGroupEvaluationType } from "#/components/common/fellow-reports/student-group-evaluation/actions";
import { columns, subColumns } from "./columns";

export default function StudentGroupEvaluationTable({
  studentGroupEvaluation,
}: {
  studentGroupEvaluation: StudentGroupEvaluationType[];
}) {
  return (
    <ExpandableReportTable
      data={studentGroupEvaluation}
      columns={columns}
      subColumns={subColumns}
      getSubRows={(row) => row.session}
      emptyStateMessage="No feedback data found"
      subEmptyStateMessage="No expenses found for this fellow"
    />
  );
}
