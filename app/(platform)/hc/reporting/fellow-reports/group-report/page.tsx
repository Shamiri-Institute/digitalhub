import { currentHubCoordinator } from "#/app/auth";
import { loadFellowGroupReports } from "#/components/common/fellow-reports/group-report/actions";
import GroupReportTable from "#/components/common/fellow-reports/group-report/group-report-table";

export default async function GroupReportPage() {
  const hubCoordinator = await currentHubCoordinator();
  const hubId = hubCoordinator?.profile?.assignedHubId;
  const rows = await loadFellowGroupReports(hubId ? { scope: "hub", hubId } : undefined);

  return (
    <div className="container w-full grow space-y-3">
      <GroupReportTable rows={rows} />
    </div>
  );
}
