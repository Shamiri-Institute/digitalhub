import { loadHubSupervisorExpenses } from "#/app/(platform)/hc/reporting/supervisors/actions";
import HCSupervisorsDataTable from "#/app/(platform)/hc/reporting/supervisors/components/supervisors-table";

export default async function SupervisorsPage() {
  const expensesData = await loadHubSupervisorExpenses();

  return <HCSupervisorsDataTable supervisorExpenses={expensesData} />;
}
