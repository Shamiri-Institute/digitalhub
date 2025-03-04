import { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import ClinicalCaseSessionsAttendanceHistory from "#/app/(platform)/sc/clinical/components/cases-sessions-attendance-history";
import ConsultClinicalExpert from "#/app/(platform)/sc/clinical/components/consult-clinical-expert";
import MarkCaseAsSpecial from "#/app/(platform)/sc/clinical/components/mark-case-as-special";
import ReferClinicalCase from "#/app/(platform)/sc/clinical/components/refer-clinical-case";
import ViewEditClinicalCaseStudentInfo from "#/app/(platform)/sc/clinical/components/view-edit-student-info";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";

export default function ClinicalCaseActionsDropdownMenu({
  clinicalCase,
}: {
  clinicalCase: ClinicalCases;
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
        <ViewEditClinicalCaseStudentInfo clinicalCase={clinicalCase}>
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            Edit student information
          </div>
        </ViewEditClinicalCaseStudentInfo>
        <ReferClinicalCase clinicalCase={clinicalCase}>
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            Refer case
          </div>
        </ReferClinicalCase>
        <ConsultClinicalExpert clinicalCase={clinicalCase}>
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            Consult clinical expert
          </div>
        </ConsultClinicalExpert>
        <MarkCaseAsSpecial
          caseId={clinicalCase.id}
          reason={clinicalCase.flaggedReason}
        >
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            Mark as special/ambiguous
          </div>
        </MarkCaseAsSpecial>
        <ClinicalCaseSessionsAttendanceHistory clinicalCase={clinicalCase}>
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            View attendance history
          </div>
        </ClinicalCaseSessionsAttendanceHistory>
        <div
          className={cn(
            "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
          )}
        >
          Progress notes
        </div>
        <div
          className={cn(
            "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
          )}
        >
          Treatment plan upload
        </div>
        <div
          className={cn(
            "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
          )}
        >
          Case reports uplod
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
