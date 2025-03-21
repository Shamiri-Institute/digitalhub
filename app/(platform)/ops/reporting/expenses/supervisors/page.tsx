import HCSupervisorsDataTable from "#/app/(platform)/hc/reporting/expenses/supervisors/components/supervisors-table";
import {
  getSupervisorsInImplementation,
  loadHubsSupervisorExpenses,
} from "#/app/(platform)/ops/reporting/expenses/supervisors/actions";
import { currentOpsUser } from "#/app/auth";
import { signOut } from "next-auth/react";

export default async function SupervisorsPage() {
  const opsUser = await currentOpsUser();

  if (!opsUser) {
    return signOut({ callbackUrl: "/login" });
  }
  const expensesData = await loadHubsSupervisorExpenses();

  const supervisors = await getSupervisorsInImplementation();

  return (
    <HCSupervisorsDataTable
      supervisorExpenses={expensesData}
      supervisorsInHub={supervisors}
    />
  );
}
