import { WeeklyFellowEvaluationType } from "#/components/common/fellow-reports/weekly-fellow-evaluation/actions";
import ViewEditWeeklyFellowEvaluation from "#/components/common/fellow-reports/weekly-fellow-evaluation/view-edit-weekly-fellow-evaluation";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";

export default function WeeklyFellowEvaluationDropdownMenu({
  weeklyFellowEvaluation,
}: {
  weeklyFellowEvaluation: WeeklyFellowEvaluationType["week"][number];
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
        <ViewEditWeeklyFellowEvaluation
          weeklyFellowEvaluation={weeklyFellowEvaluation}
          action="view"
        >
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            View weekly evaluation
          </div>
        </ViewEditWeeklyFellowEvaluation>
        <ViewEditWeeklyFellowEvaluation
          weeklyFellowEvaluation={weeklyFellowEvaluation}
          action="edit"
        >
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            Edit weekly evaluation
          </div>
        </ViewEditWeeklyFellowEvaluation>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
