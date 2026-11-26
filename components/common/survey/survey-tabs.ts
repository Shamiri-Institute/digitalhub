import type { TabType } from "#/components/common/tabs/tab-navigation";

export const HUB_SURVEY_TABS: TabType[] = [
  { name: "Print", href: "/hc/surveys" },
  { name: "Scans", href: "/hc/surveys/scans" },
  { name: "Review", href: "/hc/surveys/review" },
  { name: "Progress", href: "/hc/surveys/progress" },
];

export const ADMIN_SURVEY_TABS: TabType[] = [
  { name: "Surveys", href: "/admin/surveys" },
  { name: "Scans", href: "/admin/surveys/scans" },
  { name: "Review", href: "/admin/surveys/review" },
];
