"use client";
import TabToggleNavigation, { type TabType } from "#/components/common/tabs/tab-navigation";

export default function RenderClTriageTabs() {
  const triageTabOptions: TabType[] = [
    { name: "Escalation gaps", href: "/cl/triage/gaps" },
    { name: "Fidelity", href: "/cl/triage/fidelity" },
    { name: "Handoff quality", href: "/cl/triage/handoffs" },
    { name: "Audit trail", href: "/cl/triage/audits" },
  ];
  return <TabToggleNavigation options={triageTabOptions} />;
}
