"use client";
import TabToggleNavigation, { type TabType } from "#/components/common/tabs/tab-navigation";

export default function RenderOpsReportingTabs() {
  const expensesReportOptions: TabType[] = [
    { name: "Fellows", href: "/ops/reporting/expenses/fellows" },
    { name: "Payout history", href: "/ops/reporting/expenses/payout-history" },
  ];
  return <TabToggleNavigation options={expensesReportOptions} />;
}
