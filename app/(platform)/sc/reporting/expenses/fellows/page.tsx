import { loadSupervisorFellowAttendance } from "#/app/(platform)/sc/reporting/expenses/fellows/actions";
import FellowsReportingDataTable from "#/components/common/expenses/fellows/fellows-table";

export default async function FellowsPage() {
  const expensesData = await loadSupervisorFellowAttendance();

  return <FellowsReportingDataTable fellowAttendanceExpenses={expensesData} />;
}
