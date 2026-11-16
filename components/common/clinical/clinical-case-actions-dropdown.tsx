import CaseUnterminateDialog from "#/app/(platform)/cl/clinical/components/case-unterminate-dialog";
import type { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import CaseNotesForm from "#/app/(platform)/sc/clinical/components/case-notes-form";
import CaseTerminationForm from "#/app/(platform)/sc/clinical/components/case-termination-form";
import ClinicalCaseSessionsAttendanceHistory from "#/app/(platform)/sc/clinical/components/cases-sessions-attendance-history";
import MarkCaseAsSpecial from "#/app/(platform)/sc/clinical/components/mark-case-as-special";
import ReferClinicalCase, {
  type ReferralOptions,
} from "#/app/(platform)/sc/clinical/components/refer-clinical-case";
import TreatmentPlanForm from "#/app/(platform)/sc/clinical/components/treatment-plan-form";
import TriggerFollowupDialog from "#/app/(platform)/sc/clinical/components/trigger-followup-dialog";
import ViewEditClinicalCaseStudentInfo from "#/app/(platform)/sc/clinical/components/view-edit-student-info";
import type { ReactElement } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { NestedDialogMenuItem } from "#/components/common/row-actions-menu";

export default function ClinicalCaseActionsDropdownMenu({
  trigger,
  clinicalCase,
  role = "CLINICAL_LEAD",
  referralOptions,
}: {
  trigger: ReactElement;
  clinicalCase: ClinicalCases;
  role?: "CLINICAL_LEAD" | "SUPERVISOR";
  referralOptions?: ReferralOptions;
}) {
  const isTerminated = clinicalCase.caseStatus === "Terminated";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-muted-foreground">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ViewEditClinicalCaseStudentInfo clinicalCase={clinicalCase}>
          <NestedDialogMenuItem>Edit student information</NestedDialogMenuItem>
        </ViewEditClinicalCaseStudentInfo>
        {role === "SUPERVISOR" && referralOptions && (
          <ReferClinicalCase clinicalCase={clinicalCase} referralOptions={referralOptions}>
            <NestedDialogMenuItem disabled={isTerminated}>Refer case</NestedDialogMenuItem>
          </ReferClinicalCase>
        )}
        <MarkCaseAsSpecial caseId={clinicalCase.id} reason={clinicalCase.flaggedReason}>
          <NestedDialogMenuItem>Mark as special/ambiguous</NestedDialogMenuItem>
        </MarkCaseAsSpecial>
        <ClinicalCaseSessionsAttendanceHistory clinicalCase={clinicalCase}>
          <NestedDialogMenuItem>View attendance history</NestedDialogMenuItem>
        </ClinicalCaseSessionsAttendanceHistory>
        <TreatmentPlanForm clinicalCase={clinicalCase} role={role}>
          <NestedDialogMenuItem
            disabled={
              clinicalCase.caseStatus !== "FollowUp" || clinicalCase.treatmentPlanUploaded !== false
            }
          >
            Treatment plan {clinicalCase.treatmentPlanUploaded ? "(Uploaded)" : ""}
          </NestedDialogMenuItem>
        </TreatmentPlanForm>
        <CaseNotesForm clinicalCase={clinicalCase} role={role}>
          <NestedDialogMenuItem disabled={isTerminated}>Case notes</NestedDialogMenuItem>
        </CaseNotesForm>
        <TriggerFollowupDialog caseId={clinicalCase.id}>
          <NestedDialogMenuItem disabled={clinicalCase.caseStatus === "FollowUp" || isTerminated}>
            Follow up
          </NestedDialogMenuItem>
        </TriggerFollowupDialog>
        <CaseTerminationForm clinicalCase={clinicalCase}>
          <NestedDialogMenuItem disabled={isTerminated}>Terminate case</NestedDialogMenuItem>
        </CaseTerminationForm>
        {role === "CLINICAL_LEAD" && isTerminated && (
          <CaseUnterminateDialog caseId={clinicalCase.id} pseudonym={clinicalCase.pseudonym}>
            <NestedDialogMenuItem>Un-terminate case</NestedDialogMenuItem>
          </CaseUnterminateDialog>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
