import { loadHubFellowAttendance } from "#/app/(platform)/hc/reporting/fellows/actions";
import HCFellowsDataTable from "#/app/(platform)/hc/reporting/fellows/components/fellows-table";

export default async function FellowsPage() {
  const expensesData = await loadHubFellowAttendance();

  return <HCFellowsDataTable fellowAttendanceExpenses={expensesData} />;
}
