"use client";
import type { ImplementerRole } from "@prisma/client";
import FileUploader from "#/components/file-uploader";
import { Button } from "#/components/ui/button";

export function BatchUploadDownloadFellow({
  disabled,
  role,
}: {
  disabled?: boolean;
  role: ImplementerRole;
}) {
  const _handleFellowCSVDownload = async () => {
    // todo: touch base with Wendy to discuss the columns
  };

  return (
    role === "HUB_COORDINATOR" && (
      <div className="flex flex-1 flex-wrap justify-end space-x-2">
        <Button
          // onClick={handleFellowCSVDownload}
          disabled={disabled}
          className="flex items-center gap-2 bg-shamiri-new-blue text-sm font-semibold leading-5 text-white"
        >
          Download fellow csv template
        </Button>
        <FileUploader disabled={disabled} url="/api/csv-uploads/fellows" type="fellows" />
      </div>
    )
  );
}
