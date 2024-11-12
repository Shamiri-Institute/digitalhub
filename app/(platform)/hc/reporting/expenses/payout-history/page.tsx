import { loadHubPayoutHistory } from "#/app/(platform)/hc/reporting/expenses/payout-history/actions";
import HCPayoutHistoryDataTable from "#/app/(platform)/hc/reporting/expenses/payout-history/components/payout-history-table";
import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";

export default async function PayoutHistoryPage() {
  const hubPayoutHistory = await loadHubPayoutHistory();

  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }

  return (
    <HCPayoutHistoryDataTable
      payoutHistory={hubPayoutHistory}
      currentHubCoordinator={hubCoordinator}
    />
  );
}
