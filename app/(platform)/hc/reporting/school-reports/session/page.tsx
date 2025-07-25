import { loadSessionReport } from "#/app/(platform)/hc/reporting/school-reports/session/actions";
import SessionReportDataTable from "#/components/common/school-reports/session/session-table";

export default async function SessionPage() {
  const sessionReportData = await loadSessionReport();

  return (
    <div className="container w-full grow space-y-3">
      <SessionReportDataTable sessionReport={sessionReportData} />
    </div>
  );
}
