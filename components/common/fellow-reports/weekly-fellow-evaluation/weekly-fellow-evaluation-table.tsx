"use client";
import { HubWeeklyFellowEvaluationType } from "#/app/(platform)/hc/reporting/fellow-reports/weekly-fellow-evaluation/action";
import DataTable from "#/components/data-table";
import { columns, subColumns } from "./columns";

export default function WeeklyFellowEvaluationTable({
  weeklyFellowEvaluation,
}: {
  weeklyFellowEvaluation: HubWeeklyFellowEvaluationType[];
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
