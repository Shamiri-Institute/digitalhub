"use client";

import type { RecordingTableData } from "#/components/common/recordings/recording-types";
import RecordingsDatatable from "#/components/common/recordings/recordings-datatable";
import { retryRecordingProcessing } from "../actions";
import UploadRecordingDialog from "./upload-recording-dialog";

export default function HCRecordingsDatatable({ data }: { data: RecordingTableData[] }) {
  return (
    <RecordingsDatatable
      data={data}
      includeSupervisor
      onRetry={retryRecordingProcessing}
      uploadDialog={UploadRecordingDialog}
    />
  );
}
