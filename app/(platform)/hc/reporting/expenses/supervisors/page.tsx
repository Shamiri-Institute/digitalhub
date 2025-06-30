import {
  getSupervisorsInHub,
  loadHubSupervisorExpenses,
} from "#/app/(platform)/hc/reporting/expenses/supervisors/actions";
import HCSupervisorsDataTable from "#/app/(platform)/hc/reporting/expenses/supervisors/components/supervisors-table";
import { currentHubCoordinator } from "#/app/auth";
import { signOut } from "next-auth/react";

export default async function SupervisorsPage() {
  const expensesData = await loadHubSupervisorExpenses();

  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    await signOut({ callbackUrl: "/login" });
  }

  const supervisorsInHub = await getSupervisorsInHub();

  return (
    <HCSupervisorsDataTable supervisorExpenses={expensesData} supervisorsInHub={supervisorsInHub} />
  );
}
