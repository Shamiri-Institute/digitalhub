import type { ReactElement } from "react";
import type { HubClinicalCases } from "#/app/(platform)/cl/clinical/actions";
import CaseUnterminateDialog from "#/app/(platform)/cl/clinical/components/case-unterminate-dialog";
import { ViewCaseNotes } from "#/components/common/clinical/view-case-notes";
import { ViewTerminationReasons } from "#/components/common/clinical/view-termination-reasons";
import { ViewTreatmentPlan } from "#/components/common/clinical/view-treatment-plan";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { NestedDialogMenuItem } from "#/components/common/row-actions-menu";

export default function ClinicalLeadCaseActionsDropdownMenu({
  trigger,
  clinicalCase,
}: {
  trigger: ReactElement;
  clinicalCase: HubClinicalCases;
}) {
  const isTerminated = clinicalCase.caseStatus === "Terminated";
  const hasNotes = clinicalCase.caseNotes && clinicalCase.caseNotes.length > 0;
  const hasTreatmentPlan = clinicalCase.followUpTreatmentPlan !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-muted-foreground">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {hasNotes ? (
          <ViewCaseNotes
            caseNotes={clinicalCase.caseNotes || []}
            pseudonym={clinicalCase.pseudonym}
          >
            <NestedDialogMenuItem>View case notes</NestedDialogMenuItem>
          </ViewCaseNotes>
        ) : (
          <DropdownMenuItem disabled>No case notes available</DropdownMenuItem>
        )}

        {hasTreatmentPlan ? (
          <ViewTreatmentPlan
            treatmentPlan={clinicalCase.followUpTreatmentPlan}
            pseudonym={clinicalCase.pseudonym}
          >
            <NestedDialogMenuItem>View treatment plan</NestedDialogMenuItem>
          </ViewTreatmentPlan>
        ) : (
          <DropdownMenuItem disabled>No treatment plan available</DropdownMenuItem>
        )}

        {isTerminated && (
          <>
            <ViewTerminationReasons
              termination={clinicalCase.termination}
              pseudonym={clinicalCase.pseudonym}
            >
              <NestedDialogMenuItem>View termination reasons</NestedDialogMenuItem>
            </ViewTerminationReasons>
            <CaseUnterminateDialog caseId={clinicalCase.id} pseudonym={clinicalCase.pseudonym}>
              <NestedDialogMenuItem>Un-terminate case</NestedDialogMenuItem>
            </CaseUnterminateDialog>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
