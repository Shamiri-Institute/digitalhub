import { redirect } from "next/navigation";
import { loadHubsFellowAttendance } from "#/app/(platform)/ops/reporting/expenses/fellows/actions";
import { currentOpsUser } from "#/app/auth";
import FellowsReportingDataTable from "#/components/common/expenses/fellows/fellows-table";

export default async function FellowsPage() {
  const opsUser = await currentOpsUser();

  if (!opsUser) {
    redirect("/login");
  }

  const expensesData = await loadHubsFellowAttendance();

  return <FellowsReportingDataTable fellowAttendanceExpenses={expensesData} />;
}
