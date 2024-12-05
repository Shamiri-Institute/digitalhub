import FellowPayoutFilterToggle from "#/components/common/expenses/payout-history/payout-filter-toggle";

export default async function FellowPayoutFilterTab() {
  return (
    <div className="flex items-center justify-start">
      <div className="flex w-1/4 gap-3">
        <FellowPayoutFilterToggle payout={[]} />
      </div>
    </div>
  );
}
