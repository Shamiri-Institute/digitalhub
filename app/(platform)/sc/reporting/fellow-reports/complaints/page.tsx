import { loadFellowComplaints } from "#/components/common/fellow-reports/complaints/actions";
import FellowComplaintsTable from "#/components/common/fellow-reports/complaints/fellow-complaints-table";

export default async function FellowComplaintsPage() {
  const fellowComplaintsData = await loadFellowComplaints();

  return (
    <div className="container w-full grow space-y-3">
      <FellowComplaintsTable fellowComplaints={fellowComplaintsData} />
    </div>
  );
}
