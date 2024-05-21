"use client";
import FileUploader from "#/components/file-uploader";
import { Button } from "#/components/ui/button";

export function BatchUploadDownloadFellow() {
  const handleFellowCSVDownload = async () => {
    // todo: touch base with Wendy to discuss the columns
  };

  return (
    <div className="flex flex-1 flex-wrap justify-end space-x-2">
      <Button
        // onClick={handleFellowCSVDownload}
        disabled
        className="flex items-center gap-2 bg-shamiri-new-blue text-sm font-semibold leading-5 text-white"
      >
        Download fellow csv template
      </Button>
      <FileUploader />
    </div>
  );
}
