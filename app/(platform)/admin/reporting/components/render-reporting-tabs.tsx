"use client";
import TabToggleNavigation, { type TabType } from "#/components/common/tabs/tab-navigation";

export default function RenderAdminReportingTabs() {
  const expensesReportOptions: TabType[] = [
    { name: "Fellows", href: "/admin/reporting/expenses/fellows" },
    { name: "Payout history", href: "/admin/reporting/expenses/payout-history" },
  ];
  return <TabToggleNavigation options={expensesReportOptions} />;
}
