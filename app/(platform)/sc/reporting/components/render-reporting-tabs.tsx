"use client";
import { usePathname } from "next/navigation";
import TabToggleNavigation, { type TabType } from "#/components/common/tabs/tab-navigation";

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
    { name: "Complaints", href: "/sc/reporting/fellow-reports/complaints" },
    { name: "AI Feedback (beta)", href: "/sc/reporting/fellow-reports/ai-feedback" },
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
    { name: "My Expenses", href: "/sc/reporting/expenses/my-expenses" },
    { name: "Payout history", href: "/sc/reporting/expenses/payout-history" },
    { name: "Complaints", href: "/sc/reporting/expenses/complaints" },
  ];

  // Session recordings page is standalone - no tab navigation needed
  if (isRecordings) {
    return null;
  }

  return (
    <>
      {isFellowReports && <TabToggleNavigation options={fellowReportOptions} />}
      {isSchoolReports && <TabToggleNavigation options={schoolReportOptions} />}
      {!isFellowReports && !isSchoolReports && !isMonitoringEvaluation && (
        <TabToggleNavigation options={expensesReportOptions} />
      )}
    </>
  );
}
