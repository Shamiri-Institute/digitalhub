"use client";

import clsx from "clsx";
import { useCallback, useState } from "react";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { DialogFooter } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { useToast } from "#/components/ui/use-toast";
import { objectId } from "#/lib/crypto";
import { createStudentAttendanceDocument } from "#/lib/actions/file/student-attendance";
import { useS3Upload } from "#/lib/hooks/use-s3-upload";
import { buildS3Key } from "#/lib/utils/s3-key-builder";

export default function UploadStudentAttendanceDocument({
  groupId,
  sessionId,
  schoolName,
  fellowName,
  groupName,
  sessionDate,
  sessionType,
  onClose,
}: {
  groupId: string;
  sessionId: string;
  schoolName?: string;
  fellowName?: string;
  groupName?: string;
  sessionDate?: string;
  sessionType?: string;
  onClose: (val: boolean) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { uploadToS3 } = useS3Upload();

  const { toast } = useToast();

  const handleFileUpload = (files: File[]) => {
    setSelectedFile(files[0] || null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "No file selected", variant: "destructive" });
      console.error("No file selected");
      return;
    }

    await handleFileChange(selectedFile);
  };

  const handleFileChange = useCallback(
    async (file: File) => {
      const missing: string[] = [];
      if (!schoolName) missing.push("schoolName");
      if (!fellowName) missing.push("fellowName");
      if (!groupName) missing.push("groupName");
      if (!sessionDate) missing.push("sessionDate");
      if (!sessionType) missing.push("sessionType");
      if (!groupId) missing.push("groupId");
      if (!sessionId) missing.push("sessionId");
      if (missing.length > 0) {
        const msg = `Missing session data: ${missing.join(", ")}`;
        toast({
          title: "Upload failed",
          description: msg,
          variant: "destructive",
        });
        return;
      }

      try {
        setUploading(true);

        const docId = objectId("att_doc");
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "pdf";

        const s3Key = buildS3Key({
          schoolName: schoolName as string,
          fellowName: fellowName as string,
          groupName: groupName as string,
          sessionType: sessionType as string,
          recordingId: docId,
          extension,
          prefix: "student-attendance",
        });

        const fileName = `${sessionType as string}_${docId}.${extension}`;

        const { key } = await uploadToS3(file, {
          endpoint: {
            request: {
              body: { key: s3Key, bucket: "student-attendance" },
            },
          },
        });

        if (!key) {
          throw new Error("Upload failed - no key returned");
        }

        const response = await createStudentAttendanceDocument({
          fileName,
          link: key,
          groupId,
          sessionId,
        });

        if (response.success) {
          onClose(false);
          toast({
            title: "File uploaded successfully",
          });
        }
      } catch (error) {
        console.error("File upload error:", error);
        toast({
          title: "File upload error",
          description: "Something went wrong uploading the file",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    },
    [uploadToS3, groupId, sessionId, schoolName, fellowName, groupName, sessionDate, sessionType, onClose, toast],
  );

  return (
    <div className="space-y-5">
      <FileUploaderWithDrop
        label="Upload attendance document"
        onChange={handleFileUpload}
        files={selectedFile ? [selectedFile] : []}
        accept="application/pdf,image/*"
      />

      <Separator />
      <DialogFooter className="flex justify-end">
        <Button className="text-shamiri-new-blue" variant="ghost" onClick={() => onClose(false)}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!selectedFile || uploading}
          variant="brand"
          onClick={handleUpload}
          className="bg-shamiri-new-blue"
          loading={uploading}
        >
          {uploading ? "Uploading attendance document..." : "Upload attendance document"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function FileUploaderWithDrop({
  label: _label,
  onChange,
  files,
  className,
  accept = "application/pdf,image/*",
}: {
  label?: string;
  onChange: (files: File[]) => void;
  files: File[];
  className?: string;
  accept?: string;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (onChange) onChange(files);
  };

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    let files: File[];

    if (e.dataTransfer.items) {
      files = Array.from(e.dataTransfer.items)
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
    } else {
      files = Array.from(e.dataTransfer.files);
    }

    if (files?.length) {
      if (onChange) onChange(files);
    } else {
      window.alert("Invalid file type.");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  return (
    <div className={clsx(className || "")}>
      <label
        id="drop_zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        className={clsx(
          "mt-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-3",
          isDragOver ? "border-secondary" : "border-gray-200",
        )}
      >
        <div className=" flex w-full items-center space-x-6">
          <div className="cursor-pointer rounded-lg border border-gray-200 p-2">
            <span className="text-normal cursor-pointer text-center">{"Select Files"}</span>
          </div>

          <div className="flex space-x-2">
            {files?.length === 0 && <Icons.uploadCloudIcon className="h-6 w-6" />}
            <span className="text-normal text-center">Drop files here...</span>
            <input type="file" accept={accept} hidden onChange={handleUpload} />
          </div>
        </div>
        <div className="mt-3 flex w-full border-t border-gray-500 ">
          {files?.length !== 0 && (
            <div className="text-normal flex items-center space-y-1 pt-2 text-center text-gray-700">
              {files.map((file: File) => (
                <div key={file.name} className="flex items-center space-x-2">
                  <Icons.check className="h-4 w-4" />
                  <span key={file.name}>{file.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </label>
    </div>
  );
}
