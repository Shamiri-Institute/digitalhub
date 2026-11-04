import type { TabType } from "#/components/common/tabs/tab-navigation";

export const HUB_SURVEY_TABS: TabType[] = [
  { name: "Print", href: "/hc/surveys" },
  { name: "Scans", href: "/hc/surveys/scans" },
];

export const ADMIN_SURVEY_TABS: TabType[] = [
  { name: "Surveys", href: "/admin/surveys" },
  { name: "Scans", href: "/admin/surveys/scans" },
];
