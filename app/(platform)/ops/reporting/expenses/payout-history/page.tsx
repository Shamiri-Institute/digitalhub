import { loadOpsHubsPayoutHistory } from "#/app/(platform)/ops/reporting/expenses/payout-history/actions";
import { currentOpsUser } from "#/app/auth";
import {
  fetchHubsWithProjects,
  fetchImplementers,
  fetchProjects,
} from "#/components/common/expenses/payout-history/actions";
import FellowPayoutHistoryDataTable from "#/components/common/expenses/payout-history/payout-history-table";
import { signOut } from "next-auth/react";

export default async function PayoutHistoryPage() {
  const opsUser = await currentOpsUser();
  const hubs = await fetchHubsWithProjects();
  const implementers = await fetchImplementers();
  const projects = await fetchProjects();

  if (!opsUser) {
    return signOut({ callbackUrl: "/login" });
  }

  const opsHubsPayoutHistory = await loadOpsHubsPayoutHistory();

  return (
    <FellowPayoutHistoryDataTable
      payoutHistory={opsHubsPayoutHistory}
      hubs={hubs}
      implementers={implementers}
      projects={projects}
    />
  );
}
