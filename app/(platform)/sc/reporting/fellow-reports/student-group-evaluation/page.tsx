import { currentSupervisor } from "#/app/auth";
import { loadStudentGroupEvaluations } from "#/components/common/fellow-reports/student-group-evaluation/actions";
import StudentGroupEvaluationTable from "#/components/common/fellow-reports/student-group-evaluation/student-group-evaluation-table";

export default async function StudentGroupEvaluationPage() {
  const supervisor = await currentSupervisor();
  const studentGroupEvaluationData = await loadStudentGroupEvaluations(
    supervisor ? { scope: "supervisor", supervisorId: supervisor.profile.id } : undefined,
  );

  return (
    <div className="container w-full grow space-y-3">
      <StudentGroupEvaluationTable studentGroupEvaluation={studentGroupEvaluationData} />
    </div>
  );
}
