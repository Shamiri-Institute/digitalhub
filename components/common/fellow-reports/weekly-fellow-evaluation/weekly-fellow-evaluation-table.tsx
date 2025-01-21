"use client";
import { WeeklyFellowEvaluationType } from "#/components/common/fellow-reports/weekly-fellow-evaluation/actions";
import DataTable from "#/components/data-table";
import { columns, subColumns } from "./columns";

export default function WeeklyFellowEvaluationTable({
  weeklyFellowEvaluation,
}: {
  weeklyFellowEvaluation: WeeklyFellowEvaluationType[];
}) {
  return (
    <div className="container w-full grow space-y-3">
      <DataTable
        data={weeklyFellowEvaluation}
        columns={columns}
        className="data-table data-table-action mt-4 bg-white"
        emptyStateMessage="No feedback data found"
        renderSubComponent={({ row }) => (
          <DataTable
            data={row.original?.week}
            editColumns={false}
            columns={subColumns}
            className="data-table data-table-action border-0 bg-white"
            emptyStateMessage="No expenses found for this fellow"
          />
        )}
      />
    </div>
  );
}
