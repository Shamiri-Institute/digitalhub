"use client";
import { usePathname } from "next/navigation";
import TabToggleNavigation, { type TabType } from "#/components/common/tabs/tab-navigation";
import PageHeading from "#/components/ui/page-heading";

export default function RenderSCReportingTabs() {
  const pathname = usePathname();

  const isFellowReports = pathname.includes("reporting/fellow-reports");
  const isSchoolReports = pathname.includes("reporting/school-reports");
  const isMonitoringEvaluation = pathname.includes("reporting/monitoring-and-evaluation");
  const isRecordings = pathname.includes("reporting/recordings");

  const fellowReportOptions: TabType[] = [
    {
      name: "Weekly fellow evaluation",
      href: "/sc/reporting/fellow-reports/weekly-fellow-evaluation",
    },
    {
      name: "Student group evaluation",
      href: "/sc/reporting/fellow-reports/student-group-evaluation",
    },
    {
      name: "Group report",
      href: "/sc/reporting/fellow-reports/group-report",
    },
    { name: "Complaints", href: "/sc/reporting/fellow-reports/complaints" },
  ];

  const schoolReportOptions: TabType[] = [
    { name: "Session", href: "/sc/reporting/school-reports/session" },
    {
      name: "School Feedback",
      href: "/sc/reporting/school-reports/school-feedback",
    },
  ];

  const expensesReportOptions: TabType[] = [
    { name: "Fellows", href: "/sc/reporting/expenses/fellows" },
    { name: "Payout history", href: "/sc/reporting/expenses/payout-history" },
  ];

  const isExpenses =
    !isFellowReports && !isSchoolReports && !isMonitoringEvaluation && !isRecordings;
  // The Reporting tab is a menu, so the page names its section here.
  const sectionTitle = isRecordings
    ? "Session recordings"
    : isMonitoringEvaluation
      ? "Monitoring and evaluation"
      : isFellowReports
        ? "Fellow reports"
        : isSchoolReports
          ? "School reports"
          : "Expenses";

  return (
    <>
      <PageHeading title={sectionTitle} />
      {isFellowReports && <TabToggleNavigation options={fellowReportOptions} />}
      {isSchoolReports && <TabToggleNavigation options={schoolReportOptions} />}
      {isExpenses && <TabToggleNavigation options={expensesReportOptions} />}
    </>
  );
}
