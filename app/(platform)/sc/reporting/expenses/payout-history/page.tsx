import { loadSupervisorPayoutHistory } from "#/app/(platform)/sc/reporting/expenses/payout-history/actions";
import { currentSupervisor } from "#/app/auth";
import FellowPayoutHistoryDataTable from "#/components/common/expenses/payout-history/payout-history-table";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";

export default async function PayoutHistoryPage() {
  const fellowPayoutHistory = await loadSupervisorPayoutHistory();

  const supervisor = await currentSupervisor();

  if (!supervisor) {
    return <InvalidPersonnelRole userRole="supervisor" />;
  }

  return <FellowPayoutHistoryDataTable payoutHistory={fellowPayoutHistory} />;
}
