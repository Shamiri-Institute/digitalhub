"use client";

import type { fellow, supervisor, weeklyFellowRatings } from "#/db/schema";
import {
  type FellowPersonalDetails,
  loadFellowPersonalDetails,
  loadFellowWeeklyEvaluations,
} from "#/app/(platform)/hc/fellows/actions";
import { ImplementerRole } from "#/db/enums";
import parsePhoneNumberFromString from "libphonenumber-js";
import { Plus } from "lucide-react";
import { type SetStateAction, useState } from "react";
import {
  columns,
  type MainFellowDialogKind,
  type MainFellowTableData,
} from "#/app/(platform)/hc/fellows/components/columns";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import FellowDetailsForm from "#/components/common/fellow/fellow-details-form";
import FellowDropoutForm from "#/components/common/fellow/fellow-dropout-form";
import WeeklyFellowEvaluation from "#/components/common/fellow/weekly-fellow-evaluation";
import SubmitComplaint from "#/components/common/submit-complaint";
import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { DialogTrigger } from "#/components/ui/dialog";
import { toastOnError } from "#/components/ui/use-toast";

type OpenMainFellowDialog =
  | { kind: "add" }
  | { kind: "edit"; fellowId: string; personalDetails: FellowPersonalDetails }
  | {
      kind: "weeklyEvaluations";
      fellowId: string;
      evaluations: (typeof weeklyFellowRatings.$inferSelect)[];
    }
  | { kind: MainFellowDialogKind; fellowId: string };

export default function MainFellowsDatatable({
  fellows,
  supervisors,
  role,
}: {
  fellows: MainFellowTableData[];
  supervisors: (Pick<typeof supervisor.$inferSelect, "id" | "supervisorName"> & {
    fellows: Pick<typeof fellow.$inferSelect, "id" | "fellowName" | "droppedOut">[];
  })[];
  role: ImplementerRole;
}) {
  const [dialog, setDialog] = useState<OpenMainFellowDialog | null>(null);
  const fellow =
    dialog && dialog.kind !== "add" ? fellows.find((f) => f.id === dialog.fellowId) : undefined;
  const fellowPersonalDetails = dialog?.kind === "edit" ? dialog.personalDetails : undefined;
  const fellowWeeklyEvaluations = dialog?.kind === "weeklyEvaluations" ? dialog.evaluations : [];

  const onDialogOpenChange = (open: SetStateAction<boolean>) => {
    if (!open) setDialog(null);
  };

  const openEditDialog = toastOnError(async ({ id: fellowId }: MainFellowTableData) => {
    const personalDetails = await loadFellowPersonalDetails(fellowId);
    setDialog({ kind: "edit", fellowId, personalDetails });
  });

  const openWeeklyEvaluationDialog = toastOnError(async ({ id: fellowId }: MainFellowTableData) => {
    const evaluations = await loadFellowWeeklyEvaluations(fellowId);
    setDialog({ kind: "weeklyEvaluations", fellowId, evaluations });
  });

  const renderTableActions = () => {
    return (
      <div className="flex items-center gap-3">
        <FellowDetailsForm
          open={dialog?.kind === "add"}
          onOpenChange={(open) => setDialog(open ? { kind: "add" } : null)}
          mode={"add"}
        >
          <DialogTrigger asChild={true}>
            <Button variant="outline" className="bg-white">
              <Plus className="h-4 w-4" />
              Add new fellow
            </Button>
          </DialogTrigger>
        </FellowDetailsForm>
      </div>
    );
  };

  return (
    <>
      <DataTable
        columns={columns(
          supervisors,
          (kind, { id: fellowId }) => setDialog({ kind, fellowId }),
          openEditDialog,
          openWeeklyEvaluationDialog,
          role,
        )}
        data={fellows}
        className={"data-table data-table-action bg-white lg:mt-4"}
        emptyStateMessage="No fellows associated with this hub"
        renderTableActions={role === ImplementerRole.ADMIN ? undefined : renderTableActions()}
        columnVisibilityState={{
          Email: false,
          Gender: false,
          County: false,
          "Sub-county": false,
        }}
      />
      {fellow && (
        <>
          <WeeklyFellowEvaluation
            fellowId={fellow.id}
            open={dialog?.kind === "weeklyEvaluations"}
            onOpenChange={onDialogOpenChange}
            evaluations={fellowWeeklyEvaluations}
            mode={"view"}
          >
            <DialogAlertWidget>
              <div className="flex items-center gap-2">
                <span>{fellow.fellowName}</span>
                <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
                <span>
                  {fellow.cellNumber &&
                    parsePhoneNumberFromString(fellow.cellNumber, "KE")?.formatNational()}
                </span>
              </div>
            </DialogAlertWidget>
          </WeeklyFellowEvaluation>
          <SubmitComplaint
            id={fellow.id}
            open={dialog?.kind === "complaints"}
            onOpenChange={onDialogOpenChange}
            complaints={fellow.complaints?.map((complaint) => {
              return {
                id: complaint.id,
                createdBy: complaint.user ?? undefined,
                createdAt: complaint.createdAt,
                complaint: complaint.complaint,
                comments: complaint.comments ?? undefined,
              };
            })}
          >
            <DialogAlertWidget separator={true}>
              <div className="flex items-center gap-2">
                <span>{fellow.fellowName}</span>
              </div>
            </DialogAlertWidget>
          </SubmitComplaint>
          <FellowDropoutForm
            fellow={fellow}
            isOpen={dialog?.kind === "dropout"}
            setIsOpen={onDialogOpenChange}
            supervisors={supervisors}
          />
          {fellowPersonalDetails && (
            <FellowDetailsForm
              fellow={{ ...fellow, ...fellowPersonalDetails }}
              open={dialog?.kind === "edit"}
              onOpenChange={onDialogOpenChange}
              mode={role === ImplementerRole.ADMIN ? "view" : "edit"}
            />
          )}
        </>
      )}
    </>
  );
}
