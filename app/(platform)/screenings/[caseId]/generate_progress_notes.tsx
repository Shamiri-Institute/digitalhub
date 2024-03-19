import { readFileContent } from "#/app/(platform)/screenings/[caseId]/components/treatment-plan";
import { CurrentCase } from "#/app/(platform)/screenings/screen";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useToast } from "#/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, useState } from "react";

export function GenerateProgressNotes({
  currentcase,
}: {
  currentcase: CurrentCase;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!event?.target?.files) return;

    const file = event.target.files[0];

    if (file) {
      setSelectedFile(file);
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "No file selected", variant: "destructive" });
      console.error("No file selected");
      return;
    }

    const formData = new FormData();

    formData.append("studentId", currentcase.student.id);
    formData.append("caseId", currentcase.id);

    const fileContent = await readFileContent(selectedFile);
    formData.append("file", fileContent, selectedFile.name);

    try {
      setUploading(true);

      const resp = await fetch("/api/files/gdrive/progress-notes", {
        method: "POST",
        body: formData,
      });

      if (resp.ok) {
        toast({ title: "File uploaded successfully", variant: "default" });
      }
      window.location.href = `/screenings/${currentcase.id}`;
    } catch (error) {
      console.error("Failed to upload file:", error);
      toast({
        title: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {currentcase.progressNotes ? (
        <div>
          <p className="text-sm text-gray-500">Progress Notes Link</p>
          <Link
            href={currentcase.progressNotes ?? "#"}
            target="_blank"
            className="hover:bg-shamiri-brand w-full rounded-sm  py-2 text-brand underline"
          >
            {currentcase.progressNotes}
          </Link>
        </div>
      ) : (
        <div>
          <Input
            className="cursor-pointer"
            id="docx-file"
            name="docx-file"
            type="file"
            accept=".doc, .docx, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileUpload}
          />

          {selectedFile && (
            <>
              <p className="mt-2 text-sm text-gray-500">
                Selected file: {selectedFile.name}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                File size: {selectedFile.size} bytes
              </p>
            </>
          )}
          <Button
            disabled={!selectedFile || uploading}
            onClick={handleUpload}
            type="submit"
            className="hover:bg-shamiri-brand mt-2 w-full rounded-sm bg-shamiri-blue px-3 py-2 text-white"
          >
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploading ? (
              "Uploading file..."
            ) : (
              <>
                <Icons.upload className="mr-2 h-4 w-4" />
                Upload File
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
}
