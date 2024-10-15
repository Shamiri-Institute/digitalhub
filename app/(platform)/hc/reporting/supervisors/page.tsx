import { loadHubSupervisorExpenses } from "#/app/(platform)/hc/reporting/supervisors/actions";
import HCSupervisorsDataTable from "#/app/(platform)/hc/reporting/supervisors/components/supervisors-table";
import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";

export default async function SupervisorsPage() {
  const expensesData = await loadHubSupervisorExpenses();

  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }

  return (
    <HCSupervisorsDataTable
      supervisorExpenses={expensesData}
      currentHubCoordinator={hubCoordinator}
    />
  );
}
