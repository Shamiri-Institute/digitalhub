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
import { useState } from "react";
import { columns, type MainFellowTableData } from "#/app/(platform)/hc/fellows/components/columns";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import FellowDetailsForm from "#/components/common/fellow/fellow-details-form";
import FellowDropoutForm from "#/components/common/fellow/fellow-dropout-form";
import WeeklyFellowEvaluation from "#/components/common/fellow/weekly-fellow-evaluation";
import SubmitComplaint from "#/components/common/submit-complaint";
import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { DialogTrigger } from "#/components/ui/dialog";
import { toastOnError } from "#/components/ui/use-toast";

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
  const [selectedFellow, setFellow] = useState<MainFellowTableData | null>(null);
  // Read the selected fellow from the latest server data so dialogs show fresh values after a revalidate.
  const fellow = fellows.find((f) => f.id === selectedFellow?.id) ?? selectedFellow;
  const [editDialog, setEditDialog] = useState<boolean>(false);
  const [addDialog, setAddDialog] = useState<boolean>(false);
  const [weeklyEvaluationDialog, setWeeklyEvaluationDialog] = useState(false);
  const [viewComplaintsDialog, setViewComplaintsDialog] = useState(false);
  const [dropOutDialog, setDropOutDialog] = useState(false);
  const [fellowToEdit, setFellowToEdit] = useState<
    (MainFellowTableData & FellowPersonalDetails) | null
  >(null);
  const [weeklyEvaluations, setWeeklyEvaluations] = useState<
    (typeof weeklyFellowRatings.$inferSelect)[]
  >([]);

  const openEditDialog = toastOnError(async (fellowRow: MainFellowTableData) => {
    const personalDetails = await loadFellowPersonalDetails(fellowRow.id);
    setFellowToEdit({ ...fellowRow, ...personalDetails });
    setEditDialog(true);
  });

  const openWeeklyEvaluationDialog = toastOnError(async (fellowRow: MainFellowTableData) => {
    const evaluations = await loadFellowWeeklyEvaluations(fellowRow.id);
    setFellow(fellowRow);
    setWeeklyEvaluations(evaluations);
    setWeeklyEvaluationDialog(true);
  });

  const renderTableActions = () => {
    return (
      <div className="flex items-center gap-3">
        <FellowDetailsForm open={addDialog} onOpenChange={setAddDialog} mode={"add"}>
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
          setFellow,
          openEditDialog,
          openWeeklyEvaluationDialog,
          setViewComplaintsDialog,
          setDropOutDialog,
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
            open={weeklyEvaluationDialog}
            onOpenChange={setWeeklyEvaluationDialog}
            evaluations={weeklyEvaluations}
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
            open={viewComplaintsDialog}
            onOpenChange={setViewComplaintsDialog}
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
            isOpen={dropOutDialog}
            setIsOpen={setDropOutDialog}
            supervisors={supervisors}
          />
        </>
      )}
      {fellowToEdit && (
        <FellowDetailsForm
          fellow={fellowToEdit}
          open={editDialog}
          onOpenChange={setEditDialog}
          mode={role === ImplementerRole.ADMIN ? "view" : "edit"}
        />
      )}
    </>
  );
}
