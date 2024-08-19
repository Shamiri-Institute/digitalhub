"use client";

import FileUploader from "#/components/file-uploader";
import { Button } from "#/components/ui/button";

export async function BatchUploadDownloadStudents({
  hubId,
  implementerId,
  projectId,
  schoolVisibleId,
}: {
  hubId: string;
  implementerId: string;
  projectId: string;
  schoolVisibleId: string;
}) {
  const handleStudentsCSVDownload = async () => {
    // todo: get functionality from the table filter as well
  };

  return (
    <div className="flex flex-1 flex-wrap justify-end space-x-2">
      <Button
        onClick={handleStudentsCSVDownload}
        disabled
        className="flex items-center gap-2 bg-shamiri-new-blue text-sm font-semibold leading-5 text-white"
      >
        Download students csv template
      </Button>
      <FileUploader
        url="/api/csv-uploads/students"
        metadata={{ hubId, implementerId, projectId, schoolVisibleId }}
        type="students"
      />
    </div>
  );
}
