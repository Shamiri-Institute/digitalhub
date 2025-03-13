import { loadHubSupervisorExpenses } from "#/app/(platform)/hc/reporting/expenses/supervisors/actions";
import HCSupervisorsDataTable from "#/app/(platform)/hc/reporting/expenses/supervisors/components/supervisors-table";

export default async function SupervisorsPage() {
  const expensesData = await loadHubSupervisorExpenses();

  const supervisorsInHub = await getAllSupervisors();

  return (
    <HCSupervisorsDataTable
      supervisorExpenses={expensesData}
      supervisorsInHub={supervisorsInHub}
    />
  );
}
