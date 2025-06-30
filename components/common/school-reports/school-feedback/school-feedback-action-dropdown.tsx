import type { SchoolFeedbackType } from "#/app/(platform)/sc/reporting/school-reports/school-feedback/action";
import ViewEditSchoolFeedback from "#/components/common/school-reports/school-feedback/view-edit-school-feedback";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";

export default function SchoolFeedbackDropdownMenu({
  feedback,
}: {
  feedback: SchoolFeedbackType["supervisorRatings"][number];
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
        <ViewEditSchoolFeedback feedback={feedback} action="view">
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            View school feedback
          </div>
        </ViewEditSchoolFeedback>
        <ViewEditSchoolFeedback feedback={feedback} action="edit">
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            Edit school feedback
          </div>
        </ViewEditSchoolFeedback>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
