"use client";

import { useState } from "react";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import type { SupervisorFellow } from "../page";
import { type RecordingDialogKind, type RecordingTableData, recordingColumns } from "./columns";
import EditRecordingDialog from "./edit-recording-dialog";
import UploadRecordingDialog from "./upload-recording-dialog";
import ViewFeedbackDialog from "./view-feedback-dialog";

type OpenRecordingDialog = { kind: "upload" } | { kind: RecordingDialogKind; recordingId: string };

interface RecordingsDatatableProps {
  data: RecordingTableData[];
  fellows: SupervisorFellow[];
}

export default function RecordingsDatatable({ data, fellows }: RecordingsDatatableProps) {
  const [dialog, setDialog] = useState<OpenRecordingDialog | null>(null);
  const recording =
    dialog && dialog.kind !== "upload" ? data.find((r) => r.id === dialog.recordingId) : undefined;

  const onDialogOpenChange = (open: boolean) => {
    if (!open) setDialog(null);
  };

  const renderTableActions = () => {
    return (
      <Button onClick={() => setDialog({ kind: "upload" })} className="gap-1">
        <Icons.plusCircle className="h-4 w-4" />
        <span>Upload recording</span>
      </Button>
    );
  };

  return (
    <div>
      <DataTable
        urlState
        data={data}
        columns={recordingColumns({
          openDialog: (kind, { id: recordingId }) => setDialog({ kind, recordingId }),
        })}
        emptyStateMessage="No recordings found. Upload your first recording to get started."
        className="data-table data-table-action lg:mt-4"
        renderTableActions={renderTableActions()}
        columnVisibilityState={{}}
        rowSelectionDescription="recordings"
      />

      <UploadRecordingDialog
        open={dialog?.kind === "upload"}
        onOpenChange={onDialogOpenChange}
        fellows={fellows}
      />

      {recording && (
        <>
          <ViewFeedbackDialog
            recording={recording}
            open={dialog?.kind === "viewFeedback"}
            onOpenChange={onDialogOpenChange}
          />
          <EditRecordingDialog
            recording={recording}
            fellows={fellows}
            open={dialog?.kind === "edit"}
            onOpenChange={onDialogOpenChange}
          />
        </>
      )}
    </div>
  );
}
