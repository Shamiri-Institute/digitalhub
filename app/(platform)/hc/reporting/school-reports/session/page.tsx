import { loadSessionReport } from "#/app/(platform)/sc/reporting/school-reports/session/actions";
import SessionReportDataTable from "#/app/(platform)/sc/reporting/school-reports/session/components/session-table";

export default async function SessionPage() {
  const sessionReportData = await loadSessionReport();

  return (
    <div className="container w-full grow space-y-3">
      <SessionReportDataTable sessionReport={sessionReportData} />
    </div>
  );
}
