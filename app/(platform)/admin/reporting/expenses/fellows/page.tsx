import { redirect } from "next/navigation";
import { loadHubsFellowAttendance } from "#/app/(platform)/admin/reporting/expenses/fellows/actions";
import FellowsReportingDataTable from "#/components/common/expenses/fellows/fellows-table";
import { payoutScope } from "#/lib/auth/admin-access";

export default async function FellowsPage() {
  if (!(await payoutScope())) {
    redirect("/admin/schedule");
  }

  const expensesData = await loadHubsFellowAttendance();

  return <FellowsReportingDataTable fellowAttendanceExpenses={expensesData} />;
}
