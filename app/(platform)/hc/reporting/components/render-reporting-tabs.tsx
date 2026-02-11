"use client";
import { usePathname } from "next/navigation";
import TabToggleNavigation, { type TabType } from "#/components/common/tabs/tab-navigation";

export default function RenderReportingTabs() {
  const pathname = usePathname();

  const isFellowReports = pathname.includes("reporting/fellow-reports");
  const isSchoolReports = pathname.includes("reporting/school-reports");
  const isRecordings = pathname.includes("reporting/recordings");

  const fellowReportOptions: TabType[] = [
    {
      name: "Weekly fellow evaluation",
      href: "/hc/reporting/fellow-reports/weekly-fellow-evaluation",
    },
    {
      name: "Student group evaluation",
      href: "/hc/reporting/fellow-reports/student-group-evaluation",
    },
    { name: "Complaints", href: "/hc/reporting/fellow-reports/complaints" },
  ];

  const schoolReportOptions: TabType[] = [
    { name: "Session", href: "/hc/reporting/school-reports/session" },
    {
      name: "School Feedback",
      href: "/hc/reporting/school-reports/school-feedback",
    },
  ];

  const expensesReportOptions: TabType[] = [
    { name: "Fellows", href: "/hc/reporting/expenses/fellows" },
    { name: "Supervisors", href: "/hc/reporting/expenses/supervisors" },
    { name: "Payout history", href: "/hc/reporting/expenses/payout-history" },
    { name: "Complaints", href: "/hc/reporting/expenses/complaints" },
  ];

  const recordingsOptions: TabType[] = [
    { name: "Session Recordings", href: "/hc/reporting/recordings" },
  ];

  return (
    <>
      {isFellowReports && <TabToggleNavigation options={fellowReportOptions} />}
      {isSchoolReports && <TabToggleNavigation options={schoolReportOptions} />}
      {isRecordings && <TabToggleNavigation options={recordingsOptions} />}
      {!isFellowReports && !isSchoolReports && !isRecordings && (
        <TabToggleNavigation options={expensesReportOptions} />
      )}
    </>
  );
}
