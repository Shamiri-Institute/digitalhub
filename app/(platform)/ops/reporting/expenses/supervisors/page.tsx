import HCSupervisorsDataTable from "#/app/(platform)/hc/reporting/expenses/supervisors/components/supervisors-table";
import {
  getSupervisorsInImplementation,
  loadHubsSupervisorExpenses,
} from "#/app/(platform)/ops/reporting/expenses/supervisors/actions";

export default async function SupervisorsPage() {
  const expensesData = await loadHubsSupervisorExpenses();
  const supervisors = await getSupervisorsInImplementation();

  return (
    <HCSupervisorsDataTable
      supervisorExpenses={expensesData}
      supervisorsInHub={supervisors}
    />
  );
}
