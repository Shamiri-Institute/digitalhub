"use client";

import { StudentGroupEvaluationType } from "#/components/common/fellow-reports/student-group-evaluation/actions";
import DataTable from "#/components/data-table";
import { columns, subColumns } from "./columns";

export default function StudentGroupEvaluationTable({
  studentGroupEvaluation,
}: {
  studentGroupEvaluation: StudentGroupEvaluationType[];
}) {
  return (
    <div className="container w-full grow space-y-3">
      <DataTable
        data={studentGroupEvaluation}
        columns={columns}
        className="data-table data-table-action bg-white lg:mt-4"
        emptyStateMessage="No feedback data found"
        renderSubComponent={({ row }) => (
          <DataTable
            data={row.original?.session}
            editColumns={false}
            columns={subColumns}
            className="data-table data-table-action border-0 bg-white"
            emptyStateMessage="No expenses found for this fellow"
            disablePagination={true}
            disableSearch={true}
          />
        )}
      />
    </div>
  );
}
