import { SessionReportType } from "#/app/(platform)/sc/reporting/school-reports/session/actions";
import ViewEditQualitativeFeedback from "#/app/(platform)/sc/reporting/school-reports/session/components/view-edit-qualitative-feedback";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";

export default function SessionDropdownMenu({
  sessionReportData,
}: {
  sessionReportData: SessionReportType
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
        <ViewEditQualitativeFeedback   sessionReport={sessionReportData} action="view">
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            View qualitative feedback
          </div>
        </ViewEditQualitativeFeedback>
        <ViewEditQualitativeFeedback sessionReport={sessionReportData} action="edit">
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            Edit school report
          </div>
        </ViewEditQualitativeFeedback>
      </DropdownMenuContent>
    </DropdownMenu>
    
  );
}
