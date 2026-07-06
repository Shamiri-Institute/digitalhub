import { currentSupervisor } from "#/app/auth";
import { loadFellowGroupReports } from "#/components/common/fellow-reports/group-report/actions";
import GroupReportTable from "#/components/common/fellow-reports/group-report/group-report-table";

export default async function GroupReportPage() {
  const supervisor = await currentSupervisor();
  const rows = await loadFellowGroupReports(
    supervisor ? { scope: "supervisor", supervisorId: supervisor.profile.id } : undefined,
  );

  return (
    <div className="container w-full grow space-y-3">
      <GroupReportTable rows={rows} />
    </div>
  );
}
