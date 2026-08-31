"use client";
import ExpandableReportTable from "#/components/common/expandable-report-table";
import type { WeeklyFellowEvaluation } from "#/components/common/fellow-reports/weekly-fellow-evaluation/types";
import { columns, subColumns } from "./columns";

export default function WeeklyFellowEvaluationTable({
  weeklyFellowEvaluation,
}: {
  weeklyFellowEvaluation: WeeklyFellowEvaluation[];
}) {
  return (
    <ExpandableReportTable
      data={weeklyFellowEvaluation}
      columns={columns}
      subColumns={subColumns}
      getSubRows={(row) => row.week}
      emptyStateMessage="No fellow evaluation data found"
      subEmptyStateMessage="No weekly evaluation found for this fellow"
    />
  );
}
