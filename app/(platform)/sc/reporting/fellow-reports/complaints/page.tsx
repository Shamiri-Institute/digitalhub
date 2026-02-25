import { currentSupervisor } from "#/app/auth";
import { loadFellowComplaints } from "#/components/common/fellow-reports/complaints/actions";
import FellowComplaintsTable from "#/components/common/fellow-reports/complaints/fellow-complaints-table";

export default async function FellowComplaintsPage() {
  const supervisor = await currentSupervisor();
  const fellowComplaintsData = await loadFellowComplaints(
    supervisor ? { scope: "supervisor", supervisorId: supervisor.profile.id } : undefined,
  );

  return (
    <div className="container w-full grow space-y-3">
      <FellowComplaintsTable fellowComplaints={fellowComplaintsData} />
    </div>
  );
}
