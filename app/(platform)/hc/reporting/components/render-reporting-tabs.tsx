"use client";
import ReportingTabNav from "#/app/(platform)/hc/reporting/components/expenses-reports-tabs-nav";
import FellowReportsNav from "#/app/(platform)/hc/reporting/components/fellow-reports-nav";
import SchoolReportsNav from "#/app/(platform)/hc/reporting/components/school-reports-nav";
import { usePathname } from "next/navigation";

export default function RenderReportingTabs() {
  const pathname = usePathname();

  const isFellowReports = pathname.includes("reporting/fellow-reports");
  const isSchoolReports = pathname.includes("reporting/school-reports");

  return (
    <>
      {isFellowReports && <FellowReportsNav />}
      {isSchoolReports && <SchoolReportsNav />}
      {!isFellowReports && !isSchoolReports && <ReportingTabNav />}
    </>
  );
}
