import ComplaintsFilterToggle from "#/app/(platform)/hc/reporting/expenses/complaints/components/complaints-filter-toggle";

export default async function HCComplaintsFilterTab() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex w-1/4 gap-3">
        <ComplaintsFilterToggle />
      </div>
    </div>
  );
}
