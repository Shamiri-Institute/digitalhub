"use client";
import type { HubFellowsAttendancesType } from "#/app/(platform)/hc/reporting/expenses/fellows/actions";
import type { SupervisorFellowsAttendancesType } from "#/app/(platform)/sc/reporting/expenses/fellows/actions";
import ExpandableReportTable from "#/components/common/expandable-report-table";
import { columns, subColumns } from "#/components/common/expenses/fellows/columns";

export default function FellowsReportingDataTable({
  fellowAttendanceExpenses,
}: {
  fellowAttendanceExpenses: HubFellowsAttendancesType[] | SupervisorFellowsAttendancesType[];
}) {
  return (
    <ExpandableReportTable
      data={fellowAttendanceExpenses as HubFellowsAttendancesType[]}
      columns={columns}
      subColumns={subColumns}
      getSubRows={(row) => row.attendances}
      emptyStateMessage="No fellow expenses found"
      subEmptyStateMessage="No expenses found for this fellow"
      container={false}
      subDisablePagination={false}
    />
  );
}
