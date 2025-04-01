"use client";
import FileUploader from "#/components/file-uploader";
import { Button } from "#/components/ui/button";

const supervisorCSVHeaders = ["supervisor_name", "personal_email", "id_number"];

export const handleSupervisorCSVTemplateDownload = () => {
  const csvContent =
    "data:text/csv;charset=utf-8," + supervisorCSVHeaders.join(",") + "\n";
  const encodedUri = encodeURI(csvContent);

  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "supervisors-upload-template.csv");
  document.body.appendChild(link);
  link.click();
};

export function BatchUploadDownloadSupervisors({
  hubId,
  implementerId,
  schoolVisibleId,
}: {
  hubId: string;
  implementerId: string;
  schoolVisibleId: string;
}) {
  return (
    <div className="flex flex-1 flex-wrap justify-end space-x-2">
      <Button
        onClick={handleSupervisorCSVTemplateDownload}
        className="flex items-center gap-2 bg-shamiri-new-blue text-sm font-semibold leading-5 text-white"
      >
        Download supervisor csv template
      </Button>
      <FileUploader
        url="/api/csv-uploads/supervisors"
        type="supervisors"
        metadata={{
          hubId,
          implementerId,
          schoolVisibleId,
          urlPath: `/hc/schools/${schoolVisibleId}/supervisors`,
        }}
      />
    </div>
  );
}
