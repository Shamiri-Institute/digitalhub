import { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import CaseNotesForm from "#/app/(platform)/sc/clinical/components/case-notes-form";
import CaseTerminationForm from "#/app/(platform)/sc/clinical/components/case-termination-form";
import ClinicalCaseSessionsAttendanceHistory from "#/app/(platform)/sc/clinical/components/cases-sessions-attendance-history";
import ConsultClinicalExpert from "#/app/(platform)/sc/clinical/components/consult-clinical-expert";
import MarkCaseAsSpecial from "#/app/(platform)/sc/clinical/components/mark-case-as-special";
import ReferClinicalCase from "#/app/(platform)/sc/clinical/components/refer-clinical-case";
import TreatmentPlanForm from "#/app/(platform)/sc/clinical/components/treatment-plan-form";
import TriggerFollowupDialog from "#/app/(platform)/sc/clinical/components/trigger-followup-dialog";
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
  role = "SUPERVISOR",
}: {
  clinicalCase: ClinicalCases;
  role: "CLINICAL_LEAD" | "SUPERVISOR";
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
        {role === "SUPERVISOR" && (
          <>
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
          </>
        )}
        <MarkCaseAsSpecial
          caseId={clinicalCase.id}
          reason={clinicalCase.flaggedReason}
          role={role}
        >
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            Mark as special/ambiguous
          </div>
        </MarkCaseAsSpecial>
        <ClinicalCaseSessionsAttendanceHistory
          clinicalCase={clinicalCase}
        >
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
            View attendance history
          </div>
        </ClinicalCaseSessionsAttendanceHistory>
        <TreatmentPlanForm clinicalCase={clinicalCase} role={role}>
          <div
            className={cn(
              "px-2 py-1.5 text-sm",
              clinicalCase.caseStatus === "FollowUp"
                ? "cursor-pointer text-shamiri-black"
                : "pointer-events-none  cursor-not-allowed text-gray-400",
            )}
          >
            Treatment plan
          </div>
        </TreatmentPlanForm>
        <CaseNotesForm clinicalCase={clinicalCase} role={role}>
          <div
            className={cn(
              "px-2 py-1.5 text-sm",
              clinicalCase.caseStatus === "Terminated"
                ? "pointer-events-none cursor-not-allowed text-gray-400"
                : "cursor-pointer text-shamiri-black",
            )}
          >
            Case notes
          </div>
        </CaseNotesForm>
        <TriggerFollowupDialog caseId={clinicalCase.id}>
          <div
            className={cn(
              "px-2 py-1.5 text-sm",
              clinicalCase.caseStatus === "FollowUp" ||
                clinicalCase.caseStatus === "Terminated"
                ? "pointer-events-none cursor-not-allowed text-gray-400"
                : "cursor-pointer text-shamiri-black",
            )}
          >
            Follow up
          </div>
        </TriggerFollowupDialog>
        <CaseTerminationForm clinicalCase={clinicalCase}>
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
            Terminate case
          </div>
        </CaseTerminationForm>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
