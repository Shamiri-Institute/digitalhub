import { StudentGroupEvaluationType } from "#/components/common/fellow-reports/student-group-evaluation/actions";
import ViewEditStudentGroupEvaluation from "#/components/common/fellow-reports/student-group-evaluation/view-edit-student-group-evaluation";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";

export default function StudentGroupEvaluationDropdownMenu({
  studentGroupEvaluation,
}: {
  studentGroupEvaluation: StudentGroupEvaluationType["session"][number];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="absolute inset-0 border-l bg-white">
          <div className="flex h-full w-full items-center justify-center">
            <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">
            Actions
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ViewEditStudentGroupEvaluation
          studentGroupEvaluation={studentGroupEvaluation}
          action="view"
        >
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            View weekly evaluation
          </div>
        </ViewEditStudentGroupEvaluation>
        <ViewEditStudentGroupEvaluation
          studentGroupEvaluation={studentGroupEvaluation}
          action="edit"
        >
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            Edit weekly evaluation
          </div>
        </ViewEditStudentGroupEvaluation>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
