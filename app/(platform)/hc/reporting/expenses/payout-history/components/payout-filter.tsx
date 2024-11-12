import PayoutFilterToggle from "#/app/(platform)/hc/reporting/expenses/payout-history/components/payout-filter-toggle";
import { SearchCommand } from "#/components/search-command";

export default async function PayoutFilterTab({
  hubCoordinatorId,
  hubId,
}: {
  hubCoordinatorId: string;
  hubId: string;
}) {
  return (
    <div className="flex items-center justify-start">
      <div className="flex w-1/4 gap-3">
        <SearchCommand data={[]} />
        <PayoutFilterToggle payout={[]} />
      </div>
    </div>
  );
}
