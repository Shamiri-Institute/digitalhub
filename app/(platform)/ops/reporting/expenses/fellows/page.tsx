import { loadHubsFellowAttendance } from "#/app/(platform)/ops/reporting/expenses/fellows/actions";
import { currentOpsUser } from "#/app/auth";
import FellowsReportingDataTable from "#/components/common/expenses/fellows/fellows-table";
import { signOut } from "next-auth/react";

export default async function FellowsPage() {
  const opsUser = await currentOpsUser();

  if (!opsUser) {
    return signOut({ callbackUrl: "/login" });
  }

  const expensesData = await loadHubsFellowAttendance();

  return <FellowsReportingDataTable fellowAttendanceExpenses={expensesData} />;
}
