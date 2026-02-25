import { currentHubCoordinator } from "#/app/auth";
import { loadStudentGroupEvaluations } from "#/components/common/fellow-reports/student-group-evaluation/actions";
import StudentGroupEvaluationTable from "#/components/common/fellow-reports/student-group-evaluation/student-group-evaluation-table";

export default async function StudentGroupEvaluationPage() {
  const hubCoordinator = await currentHubCoordinator();
  const hubId = hubCoordinator?.profile?.assignedHubId;
  const studentGroupEvaluationData = await loadStudentGroupEvaluations(
    hubId ? { scope: "hub", hubId } : undefined,
  );

  return (
    <div className="container w-full grow space-y-3">
      <StudentGroupEvaluationTable studentGroupEvaluation={studentGroupEvaluationData} />
    </div>
  );
}
