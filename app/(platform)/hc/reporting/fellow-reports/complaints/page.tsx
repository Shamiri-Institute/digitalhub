import { currentHubCoordinator } from "#/app/auth";
import { loadFellowComplaints } from "#/components/common/fellow-reports/complaints/actions";
import FellowComplaintsTable from "#/components/common/fellow-reports/complaints/fellow-complaints-table";

export default async function FellowComplaintsPage() {
  const hubCoordinator = await currentHubCoordinator();
  const hubId = hubCoordinator?.profile?.assignedHubId;
  const fellowComplaintsData = await loadFellowComplaints(
    hubId ? { scope: "hub", hubId } : undefined,
  );

  return (
    <div className="container w-full grow space-y-3">
      <FellowComplaintsTable fellowComplaints={fellowComplaintsData} />
    </div>
  );
}
