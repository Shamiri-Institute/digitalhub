import { redirect } from "next/navigation";
import { loadImplementerPayoutHistory } from "#/app/(platform)/admin/reporting/expenses/payout-history/actions";
import { payoutRunColumns } from "#/app/(platform)/admin/reporting/expenses/payout-history/payout-run-columns";
import TriggerPayout from "#/app/(platform)/admin/reporting/expenses/payout-history/trigger-payout";
import FellowPayoutHistoryDataTable from "#/components/common/expenses/payout-history/payout-history-table";
import { payoutScope } from "#/lib/auth/admin-access";

export default async function PayoutHistoryPage() {
  if (!(await payoutScope())) {
    redirect("/admin/schedule");
  }

  const implementerPayoutHistory = await loadImplementerPayoutHistory();

  return (
    <div className="w-full grow">
      <TriggerPayout />
      <FellowPayoutHistoryDataTable
        payoutHistory={implementerPayoutHistory}
        customColumns={payoutRunColumns}
      />
    </div>
  );
}
