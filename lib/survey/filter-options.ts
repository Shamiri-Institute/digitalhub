import type { SurveyViewer } from "#/lib/auth/survey-access";

/** One choice of a list's filter, with how many of the listed things it has. */
export type FilterOption = { id: string; label: string; count: number };

/** How many of the listed things one school of one hub has for one survey. */
type FilterGroup = {
  surveyId: string;
  surveyLabel: string;
  hubId: string;
  hubName: string;
  schoolId: string;
  schoolName: string;
  count: number;
};

/** The surveys, hubs and schools a list can be filtered by, each summed from the groups. */
export function filterOptionsOf(viewerKind: SurveyViewer["kind"], groups: readonly FilterGroup[]) {
  const summed = (key: (group: FilterGroup) => { id: string; label: string }) => {
    const totals = new Map<string, FilterOption>();
    for (const group of groups) {
      const { id, label } = key(group);
      const total = totals.get(id) ?? { id, label, count: 0 };
      total.count += group.count;
      totals.set(id, total);
    }
    return [...totals.values()].toSorted((a, b) => a.label.localeCompare(b.label));
  };
  return {
    surveys: summed((group) => ({ id: group.surveyId, label: group.surveyLabel })),
    // A hub coordinator's lists are their hub's, so they have no hub to choose.
    hubs:
      viewerKind === "project"
        ? summed((group) => ({ id: group.hubId, label: group.hubName }))
        : undefined,
    schools: summed((group) => ({ id: group.schoolId, label: group.schoolName })),
  };
}
export type FilterOptions = ReturnType<typeof filterOptionsOf>;

/** A search param's value, when it has exactly one that isn't empty. */
export function searchParamValue(value: string | string[] | undefined) {
  return typeof value === "string" && value !== "" ? value : undefined;
}
