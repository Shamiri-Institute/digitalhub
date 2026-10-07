import { loadFellowGroupReports } from "#/components/common/fellow-reports/group-report/actions";
import GroupReportTable from "#/components/common/fellow-reports/group-report/group-report-table";

export default async function GroupReportPage() {
  const rows = await loadFellowGroupReports();

  return (
    <div className="container w-full grow space-y-3">
      <GroupReportTable rows={rows} />
    </div>
  );
}
