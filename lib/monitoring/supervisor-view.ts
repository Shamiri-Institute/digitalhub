import type { CardView, MonitoringCard } from "#/lib/monitoring/types";

/** Tables naming students, M-Pesa details, contact numbers or birth dates: a supervisor gets their own rows. */
const PERSONAL_DETAIL_CARD_IDS = new Set([
  4663, 4665, 4666, 4679, 4687, 4708, 4715, 4717, 4738, 4742, 4748,
]);

/** These queries take no supervisor filter, so there is no "You" figure to set beside the hub's. */
const CARD_IDS_WITHOUT_SUPERVISOR_FILTER = new Set([
  4639, 4645, 4664, 4667, 4670, 4671, 4675, 4692, 4693, 4696, 4699, 4721, 4725, 4729, 4745, 4754,
  5137, 5138, 5139, 5189,
]);

function viewShowsSupervisorColumn(view: CardView) {
  switch (view.kind) {
    case "table":
      return view.columns.some(({ key }) => key === "supervisorName");
    case "pivot":
      return view.row === "supervisorName" || view.column === "supervisorName";
    case "bar":
    case "line":
      return view.x === "supervisorName";
    default:
      return false;
  }
}

export type SupervisorCardScope = "own-rows" | "hub" | "you-vs-hub";

export function supervisorCardScope({ metabaseCardId, view }: MonitoringCard): SupervisorCardScope {
  if (PERSONAL_DETAIL_CARD_IDS.has(metabaseCardId)) return "own-rows";
  if (
    CARD_IDS_WITHOUT_SUPERVISOR_FILTER.has(metabaseCardId) ||
    viewShowsSupervisorColumn(view) ||
    view.kind === "table" ||
    view.kind === "pivot"
  ) {
    return "hub";
  }
  return "you-vs-hub";
}
