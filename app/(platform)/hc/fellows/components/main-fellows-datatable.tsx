"use client";

import {
  columns,
  MainFellowTableData,
} from "#/app/(platform)/hc/fellows/components/columns";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import FellowDetailsForm from "#/components/common/fellow/fellow-details-form";
import FellowDropoutForm from "#/components/common/fellow/fellow-dropout-form";
import UploadFellowContract from "#/components/common/fellow/upload-contract";
import UploadFellowID from "#/components/common/fellow/upload-id";
import UploadFellowQualification from "#/components/common/fellow/upload-qualification";
import WeeklyFellowEvaluation from "#/components/common/fellow/weekly-fellow-evaluation";
import SubmitComplaint from "#/components/common/submit-complaint";
import DataTable from "#/components/data-table";
import FileUploader from "#/components/file-uploader";
import { Button } from "#/components/ui/button";
import { DialogTrigger } from "#/components/ui/dialog";
import { ImplementerRole, Prisma } from "@prisma/client";
import parsePhoneNumberFromString from "libphonenumber-js";
import { useState } from "react";

const fellowCSVHeaders = [
  "fellow_name",
  "cell_no",
  "email",
  "mpesa_name",
  "mpesa_number",
  "id_number",
  "gender",
  "county",
  "sub_county",
];

export default function MainFellowsDatatable({
  fellows,
  supervisors,
  weeklyEvaluations,
  role,
}: {
  fellows: MainFellowTableData[];
  supervisors: Prisma.SupervisorGetPayload<{}>[];
  weeklyEvaluations: Prisma.WeeklyFellowRatingsGetPayload<{}>[];
  role: ImplementerRole;
}) {
  const [fellow, setFellow] = useState<MainFellowTableData | null>(null);
  const [editDialog, setEditDialog] = useState<boolean>(false);
  const [addDialog, setAddDialog] = useState<boolean>(false);
  const [uploadIdDialog, setUploadIdDialog] = useState<boolean>(false);
  const [uploadContractDialog, setUploadContractDialog] =
    useState<boolean>(false);
  const [uploadQualificationDialog, setUploadQualificationDialog] =
    useState<boolean>(false);
  const [weeklyEvaluationDialog, setWeeklyEvaluationDialog] = useState(false);
  const [viewComplaintsDialog, setViewComplaintsDialog] = useState(false);
  const [dropOutDialog, setDropOutDialog] = useState(false);

  const downloadFellowsCsvTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," + fellowCSVHeaders.join(",") + "\n";
    const encodedUri = encodeURI(csvContent);

    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fellows-upload-template.csv");
    document.body.appendChild(link);
    link.click();
  };

  const renderTableActions = () => {
    return (
      <div className="flex items-center gap-3">
        <FileUploader
          url="/api/csv-uploads/fellows"
          type="fellows"
          uploadVisibleMessage="Upload fellows CSV"
          metadata={{
            urlPath: "/hc/fellows",
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="bg-white"
          onClick={downloadFellowsCsvTemplate}
        >
          Download fellows csv template
        </Button>
        <FellowDetailsForm
          open={addDialog}
          onOpenChange={setAddDialog}
          mode={"add"}
        >
          <DialogTrigger asChild={true}>
            <Button variant="outline" className="bg-white">
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
          setEditDialog,
          setWeeklyEvaluationDialog,
          setUploadContractDialog,
          setUploadIdDialog,
          setUploadQualificationDialog,
          setViewComplaintsDialog,
          setDropOutDialog,
        )}
        data={fellows}
        className={"data-table data-table-action mt-4 bg-white"}
        emptyStateMessage="No fellows associated with this hub"
        renderTableActions={renderTableActions()}
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
            evaluations={weeklyEvaluations.filter(
              (evaluation) => evaluation.fellowId === fellow.id,
            )}
            mode={"view"}
          >
            <DialogAlertWidget>
              <div className="flex items-center gap-2">
                <span>{fellow.fellowName}</span>
                <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                  {""}
                </span>
                <span>
                  {fellow.cellNumber &&
                    parsePhoneNumberFromString(
                      fellow.cellNumber,
                      "KE",
                    )?.formatNational()}
                </span>
              </div>
            </DialogAlertWidget>
          </WeeklyFellowEvaluation>
          <FellowDetailsForm
            fellow={fellow}
            open={editDialog}
            onOpenChange={setEditDialog}
            mode={"edit"}
          />
          <UploadFellowContract
            fellow={fellow}
            open={uploadContractDialog}
            onOpenChange={setUploadContractDialog}
          />
          <UploadFellowID
            fellow={fellow}
            open={uploadIdDialog}
            onOpenChange={setUploadIdDialog}
          />
          <UploadFellowQualification
            fellow={fellow}
            open={uploadQualificationDialog}
            onOpenChange={setUploadQualificationDialog}
          />
          <SubmitComplaint
            id={fellow.id}
            open={viewComplaintsDialog}
            onOpenChange={setViewComplaintsDialog}
            role={role}
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
          />
        </>
      )}
    </>
  );
}
