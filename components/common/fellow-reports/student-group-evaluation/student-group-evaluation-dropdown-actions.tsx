import type { StudentGroupEvaluationType } from "#/components/common/fellow-reports/student-group-evaluation/actions";
import ViewEditStudentGroupEvaluation from "#/components/common/fellow-reports/student-group-evaluation/view-edit-student-group-evaluation";
import ViewEditReportDropdown from "#/components/common/view-edit-report-dropdown";

export default function StudentGroupEvaluationDropdownMenu({
  studentGroupEvaluation,
}: {
  studentGroupEvaluation: StudentGroupEvaluationType["session"][number];
}) {
  return (
    <ViewEditReportDropdown
      viewLabel="View student group evaluation"
      editLabel="Edit student group evaluation"
      renderDialog={(action, children) => (
        <ViewEditStudentGroupEvaluation
          studentGroupEvaluation={studentGroupEvaluation}
          action={action}
        >
          {children}
        </ViewEditStudentGroupEvaluation>
      )}
    />
  );
}
