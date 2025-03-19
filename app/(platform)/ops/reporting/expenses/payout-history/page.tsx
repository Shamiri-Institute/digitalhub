import { loadOpsHubsPayoutHistory } from "#/app/(platform)/ops/reporting/expenses/payout-history/actions";
import { currentOpsUser } from "#/app/auth";
import FellowPayoutHistoryDataTable from "#/components/common/expenses/payout-history/payout-history-table";
import { signOut } from "next-auth/react";

export default async function PayoutHistoryPage() {
  const opsHubsPayoutHistory = await loadOpsHubsPayoutHistory();

  const opsUser = await currentOpsUser();

  if (!opsUser) {
    return signOut({ callbackUrl: "/login" });
  }

  return <FellowPayoutHistoryDataTable payoutHistory={opsHubsPayoutHistory} />;
}
