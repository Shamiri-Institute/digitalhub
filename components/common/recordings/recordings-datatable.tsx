"use client";

import type { ComponentType } from "react";
import { useState } from "react";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { createRecordingColumns } from "./recording-columns";
import type { RecordingTableData } from "./recording-types";
import ViewFeedbackDialog from "./view-feedback-dialog";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RecordingsDatatableProps {
  data: RecordingTableData[];
  includeSupervisor?: boolean;
  onRetry: (id: string) => Promise<{ success: boolean; message: string }>;
  uploadDialog: ComponentType<UploadDialogProps>;
}

export default function RecordingsDatatable({
  data,
  includeSupervisor = false,
  onRetry,
  uploadDialog: UploadRecordingDialog,
}: RecordingsDatatableProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewFeedbackDialog, setViewFeedbackDialog] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<RecordingTableData | null>(null);

  const renderTableActions = () => {
    return (
      <Button onClick={() => setUploadOpen(true)} className="gap-1">
        <Icons.plusCircle className="h-4 w-4" />
        <span>Upload Recording</span>
      </Button>
    );
  };

  return (
    <div>
      <DataTable
        data={data}
        columns={createRecordingColumns(
          {
            setViewFeedbackDialog,
            setSelectedRecording,
            onRetry,
          },
          { includeSupervisor },
        )}
        emptyStateMessage="No recordings found. Upload your first recording to get started."
        className="data-table data-table-action lg:mt-4"
        renderTableActions={renderTableActions()}
        columnVisibilityState={{}}
        rowSelectionDescription="recordings"
      />

      <UploadRecordingDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      {selectedRecording && (
        <ViewFeedbackDialog
          recording={selectedRecording}
          open={viewFeedbackDialog}
          onOpenChange={setViewFeedbackDialog}
        />
      )}
    </div>
  );
}
