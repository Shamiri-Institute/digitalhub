"use client";
import { usePathname } from "next/navigation";
import TabToggleNavigation, { type TabType } from "#/components/common/tabs/tab-navigation";

export default function RenderReportingTabs() {
  const pathname = usePathname();

  const isFellowReports = pathname.includes("reporting/fellow-reports");
  const isSchoolReports = pathname.includes("reporting/school-reports");

  const fellowReportOptions: TabType[] = [
    {
      name: "Weekly fellow evaluation",
      href: "/admin/reporting/fellow-reports/weekly-fellow-evaluation",
    },
    {
      name: "Student group evaluation",
      href: "/admin/reporting/fellow-reports/student-group-evaluation",
    },
    // { name: "Complaints", href: "/admin/reporting/fellow-reports/complaints" },
  ];

  const schoolReportOptions: TabType[] = [
    { name: "Session", href: "/admin/reporting/school-reports/session" },
    {
      name: "School Feedback",
      href: "/admin/reporting/school-reports/school-feedback",
    },
  ];

  const expensesReportOptions: TabType[] = [
    { name: "Fellows", href: "/admin/reporting/expenses/fellows" },
    { name: "Supervisors", href: "/admin/reporting/expenses/supervisors" },
    { name: "Payout history", href: "/admin/reporting/expenses/payout-history" },
    // { name: "Complaints", href: "/admin/reporting/expenses/complaints" },
  ];
  return (
    <>
      {isFellowReports && <TabToggleNavigation options={fellowReportOptions} />}
      {isSchoolReports && <TabToggleNavigation options={schoolReportOptions} />}
      {!isFellowReports && !isSchoolReports && (
        <TabToggleNavigation options={expensesReportOptions} />
      )}
    </>
  );
}
