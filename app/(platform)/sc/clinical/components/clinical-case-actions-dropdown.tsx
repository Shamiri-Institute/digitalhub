import { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import ClinicalCaseSessionsAttendanceHistory from "#/app/(platform)/sc/clinical/components/cases-sessions-attendance-history";
import ConsultClinicalExpert from "#/app/(platform)/sc/clinical/components/consult-clinical-expert";
import MarkCaseAsSpecial from "#/app/(platform)/sc/clinical/components/mark-case-as-special";
import ReferClinicalCase from "#/app/(platform)/sc/clinical/components/refer-clinical-case";
import TreatmentPlanForm from "#/app/(platform)/sc/clinical/components/treatment-plan-form";
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
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
            Edit student information
          </div>
        </ViewEditClinicalCaseStudentInfo>
        <ReferClinicalCase clinicalCase={clinicalCase}>
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
            Refer case
          </div>
        </ReferClinicalCase>
        <ConsultClinicalExpert clinicalCase={clinicalCase}>
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
            Consult clinical expert
          </div>
        </ConsultClinicalExpert>
        <MarkCaseAsSpecial clinicalCase={clinicalCase}>
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
            Mark as special/ambiguous
          </div>
        </MarkCaseAsSpecial>
        <ClinicalCaseSessionsAttendanceHistory clinicalCase={clinicalCase}>
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
            View attendance history
          </div>
        </ClinicalCaseSessionsAttendanceHistory>
        <TreatmentPlanForm clinicalCase={clinicalCase}>
          <div
            className={cn(
              "px-2 py-1.5 text-sm",
              clinicalCase.caseStatus === "Follow-up"
                ? "cursor-pointer text-shamiri-black"
                : "pointer-events-none  cursor-not-allowed text-gray-400",
            )}
          >
            Treatment plan
          </div>
        </TreatmentPlanForm>
        <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
          Case reports uplod
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
