import { loadHubFellowAttendance } from "#/app/(platform)/hc/reporting/expenses/fellows/actions";
import FellowsReportingDataTable from "#/components/common/expenses/fellows/fellows-table";

export default async function FellowsPage() {
  const expensesData = await loadHubFellowAttendance();

  return <FellowsReportingDataTable fellowAttendanceExpenses={expensesData} />;
}
