import ComplaintsFilterToggle from "#/components/common/expenses/complaints/complaints-filter-toggle";

export default async function FellowComplaintsFilterTab() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex w-1/4 gap-3">
        <ComplaintsFilterToggle />
      </div>
    </div>
  );
}
