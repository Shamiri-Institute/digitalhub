import { loadStudentGroupEvaluation } from "#/components/common/fellow-reports/student-group-evaluation/actions";
import StudentGroupEvaluationTable from "#/components/common/fellow-reports/student-group-evaluation/student-group-evaluation-table";

export default async function StudentGroupEvaluationPage() {
  const studentGroupEvaluationData = await loadStudentGroupEvaluation();

  return (
    <div className="container w-full grow space-y-3">
      <StudentGroupEvaluationTable
        studentGroupEvaluation={studentGroupEvaluationData}
      />
    </div>
  );
}
