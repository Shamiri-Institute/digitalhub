"use client";

import type { RecordingTableData } from "#/components/common/recordings/recording-types";
import RecordingsDatatable from "#/components/common/recordings/recordings-datatable";
import { retryRecordingProcessing } from "../actions";
import UploadRecordingDialog from "./upload-recording-dialog";

interface HCRecordingsDatatableProps {
  data: RecordingTableData[];
}

export default function HCRecordingsDatatable({ data }: HCRecordingsDatatableProps) {
  return (
    <RecordingsDatatable
      data={data}
      includeSupervisor
      onRetry={retryRecordingProcessing}
      uploadDialog={UploadRecordingDialog}
    />
  );
}
