import WeeklyFellowEvaluationTable from "#/components/common/fellow-reports/weekly-fellow-evaluation/weekly-fellow-evaluation-table";
import { loadWeeklyFellowEvaluation } from "./action";
export default async function WeeklyFellowEvaluationPage() {
  const weeklyFellowEvaluationData = await loadWeeklyFellowEvaluation();

  return (
    <div className="container w-full grow space-y-3">
      <WeeklyFellowEvaluationTable
        weeklyFellowEvaluation={weeklyFellowEvaluationData}
      />
    </div>
  );
}
