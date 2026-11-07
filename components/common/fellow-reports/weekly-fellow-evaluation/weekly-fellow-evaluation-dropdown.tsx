import { format } from "date-fns";
import type { WeeklyFellowEvaluation } from "#/components/common/fellow-reports/weekly-fellow-evaluation/types";
import ViewEditWeeklyFellowEvaluation from "#/components/common/fellow-reports/weekly-fellow-evaluation/view-edit-weekly-fellow-evaluation";
import ViewEditReportDropdown from "#/components/common/view-edit-report-dropdown";

export default function WeeklyFellowEvaluationDropdownMenu({
  weeklyFellowEvaluation,
}: {
  weeklyFellowEvaluation: WeeklyFellowEvaluation["week"][number];
}) {
  return (
    <ViewEditReportDropdown
      triggerLabel={`Actions for the week of ${format(weeklyFellowEvaluation.week, "dd MMM yyyy")}`}
      viewLabel="View weekly evaluation"
      editLabel="Edit weekly evaluation"
      renderDialog={(action, children) => (
        <ViewEditWeeklyFellowEvaluation
          weeklyFellowEvaluation={weeklyFellowEvaluation}
          action={action}
        >
          {children}
        </ViewEditWeeklyFellowEvaluation>
      )}
    />
  );
}
