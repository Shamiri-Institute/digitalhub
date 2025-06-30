import { loadHubWeeklyFellowEvaluation } from "#/app/(platform)/hc/reporting/fellow-reports/weekly-fellow-evaluation/action";
import WeeklyFellowEvaluationTable from "#/components/common/fellow-reports/weekly-fellow-evaluation/weekly-fellow-evaluation-table";

export default async function WeeklyFellowEvaluationPage() {
  const weeklyFellowEvaluationData = await loadHubWeeklyFellowEvaluation();

  return (
    <div className="container w-full grow space-y-3">
      <WeeklyFellowEvaluationTable weeklyFellowEvaluation={weeklyFellowEvaluationData} />
    </div>
  );
}
