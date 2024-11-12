import { loadHubFellowAttendance } from "#/app/(platform)/hc/reporting/expenses/fellows/actions";
import HCFellowsDataTable from "#/app/(platform)/hc/reporting/expenses/fellows/components/fellows-table";

export default async function FellowsPage() {
  const expensesData = await loadHubFellowAttendance();

  return <HCFellowsDataTable fellowAttendanceExpenses={expensesData} />;
}
