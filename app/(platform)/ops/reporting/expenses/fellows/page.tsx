import { loadHubsFellowAttendance } from "#/app/(platform)/ops/reporting/expenses/fellows/actions";
import FellowsReportingDataTable from "#/components/common/expenses/fellows/fellows-table";

export default async function FellowsPage() {
  const expensesData = await loadHubsFellowAttendance();

  return <FellowsReportingDataTable fellowAttendanceExpenses={expensesData} />;
}
