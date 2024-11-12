import PayoutFilterToggle from "#/app/(platform)/hc/reporting/expenses/payout-history/components/payout-filter-toggle";

export default async function PayoutFilterTab({ hubId }: { hubId: string }) {
  return (
    <div className="flex items-center justify-start">
      <div className="flex w-1/4 gap-3">
        <PayoutFilterToggle payout={[]} />
      </div>
    </div>
  );
}
