"use client";
import TabToggleNavigation, { type TabType } from "#/components/common/tabs/tab-navigation";

export default function RenderOpsReportingTabs() {
  const expensesReportOptions: TabType[] = [
    { name: "Fellows", href: "/ops/reporting/expenses/fellows" },
    { name: "Supervisors", href: "/ops/reporting/expenses/supervisors" },
    { name: "Payout history", href: "/ops/reporting/expenses/payout-history" },
    { name: "Complaints", href: "/ops/reporting/expenses/complaints" },
  ];
  return <TabToggleNavigation options={expensesReportOptions} />;
}
