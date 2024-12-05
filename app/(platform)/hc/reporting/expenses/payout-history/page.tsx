import { loadHubPayoutHistory } from "#/app/(platform)/hc/reporting/expenses/payout-history/actions";
import { currentHubCoordinator } from "#/app/auth";
import FellowPayoutHistoryDataTable from "#/components/common/expenses/payout-history/payout-history-table";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";

export default async function PayoutHistoryPage() {
  const hubPayoutHistory = await loadHubPayoutHistory();

  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }

  return <FellowPayoutHistoryDataTable payoutHistory={hubPayoutHistory} />;
}
