"use client";

import { useState } from "react";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { type RecordingTableData, recordingColumns } from "./columns";
import UploadRecordingDialog from "./upload-recording-dialog";
import ViewFeedbackDialog from "./view-feedback-dialog";

interface RecordingsDatatableProps {
  data: RecordingTableData[];
}

export default function RecordingsDatatable({ data }: RecordingsDatatableProps) {
  const [uploadDialog, setUploadDialog] = useState(false);
  const [viewFeedbackDialog, setViewFeedbackDialog] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<RecordingTableData | null>(null);

  const renderTableActions = () => {
    return (
      <Button onClick={() => setUploadDialog(true)} className="gap-1">
        <Icons.plusCircle className="h-4 w-4" />
        <span>Upload Recording</span>
      </Button>
    );
  };

  return (
    <div>
      <DataTable
        data={data}
        columns={recordingColumns({
          setViewFeedbackDialog,
          setSelectedRecording,
        })}
        emptyStateMessage="No recordings found. Upload your first recording to get started."
        className="data-table data-table-action lg:mt-4"
        renderTableActions={renderTableActions()}
        columnVisibilityState={{}}
        rowSelectionDescription="recordings"
      />

      <UploadRecordingDialog open={uploadDialog} onOpenChange={setUploadDialog} />

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
