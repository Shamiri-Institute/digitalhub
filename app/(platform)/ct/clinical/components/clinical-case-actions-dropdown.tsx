import type { HubClinicalCases } from "#/app/(platform)/cl/clinical/actions";
import { ViewTerminationReasons } from "#/app/(platform)/cl/clinical/components/view-termination-reasons";
import { ViewCaseNotes } from "#/components/common/clinical/view-case-notes";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";

export default function ClinicalLeadCaseActionsDropdownMenu({
  clinicalCase,
}: {
  clinicalCase: HubClinicalCases;
}) {
  const isTerminated = clinicalCase.caseStatus === "Terminated";
  const hasNotes = clinicalCase.caseNotes && clinicalCase.caseNotes.length > 0;

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
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {hasNotes ? (
          <ViewCaseNotes
            caseNotes={clinicalCase.caseNotes || []}
            pseudonym={clinicalCase.pseudonym}
          >
            <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
              View case notes
            </div>
          </ViewCaseNotes>
        ) : (
          <div className="cursor-not-allowed px-2 py-1.5 text-sm text-gray-400">
            No case notes available
          </div>
        )}

        <ViewTerminationReasons
          termination={clinicalCase.termination}
          pseudonym={clinicalCase.pseudonym}
          isTerminated={isTerminated}
        >
          <div
            className={cn(
              "px-2 py-1.5 text-sm",
              isTerminated
                ? "cursor-pointer text-shamiri-black"
                : "cursor-not-allowed text-gray-400",
            )}
          >
            {isTerminated ? "View termination reasons" : "Case not terminated"}
          </div>
        </ViewTerminationReasons>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
