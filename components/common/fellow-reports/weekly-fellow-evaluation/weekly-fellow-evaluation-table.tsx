"use client";
import { WeeklyFellowEvaluation } from "#/components/common/fellow-reports/weekly-fellow-evaluation/types";
import DataTable from "#/components/data-table";
import { columns, subColumns } from "./columns";

export default function WeeklyFellowEvaluationTable({
  weeklyFellowEvaluation,
}: {
  weeklyFellowEvaluation: WeeklyFellowEvaluation[];
}) {
  return (
    <div className="container w-full grow space-y-3">
      <DataTable
        data={weeklyFellowEvaluation}
        columns={columns}
        className="data-table data-table-action bg-white lg:mt-4"
        emptyStateMessage="No fellow evaluation data found"
        renderSubComponent={({ row }) => (
          <DataTable
            data={row.original?.week}
            editColumns={false}
            columns={subColumns}
            className="data-table data-table-action border-0 bg-white"
            emptyStateMessage="No weekly evaluation found for this fellow"
          />
        )}
      />
    </div>
  );
}
