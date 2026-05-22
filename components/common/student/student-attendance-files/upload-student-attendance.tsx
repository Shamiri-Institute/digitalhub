"use client";

import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { DialogFooter } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { useToast } from "#/components/ui/use-toast";
import {
  createStudentAttendanceDocument,
  getAttendanceDocument,
} from "#/lib/actions/file/student-attendance";
import { objectId } from "#/lib/crypto";
import { useS3Upload } from "#/lib/hooks/use-s3-upload";
import { appendToPdf, imagesToPdf } from "#/lib/utils/pdf";
import { buildS3Key, sanitizeForS3Key } from "#/lib/utils/s3-key-builder";

export default function UploadStudentAttendanceDocument({
  groupId,
  sessionId,
  schoolName,
  fellowName,
  groupName,
  sessionDate,
  sessionType,
  onClose,
  onUploadSuccess,
}: {
  groupId: string;
  sessionId: string;
  schoolName?: string;
  fellowName?: string;
  groupName?: string;
  sessionDate?: string;
  sessionType?: string;
  onClose: (val: boolean) => void;
  onUploadSuccess?: () => void;
}) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const { uploadToS3 } = useS3Upload();
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  const addFiles = useCallback((files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
    const newUrls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newUrls]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();

      let files: File[] = [];
      if (e.dataTransfer.items) {
        files = Array.from(e.dataTransfer.items)
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null);
      } else {
        files = Array.from(e.dataTransfer.files);
      }

      if (files.length > 0) {
        addFiles(files);
      }
    },
    [addFiles],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        addFiles(files);
      }
    },
    [addFiles],
  );

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({ title: "No files selected", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      const existing = await getAttendanceDocument(sessionId, groupId);

      let pdfBlob: Blob;
      if (existing.success && existing.data?.presignedUrl) {
        const response = await fetch(existing.data.presignedUrl);
        const existingPdfBytes = await response.arrayBuffer();
        pdfBlob = await appendToPdf(existingPdfBytes, selectedFiles);
      } else {
        pdfBlob = await imagesToPdf(selectedFiles);
      }

      const pdfFile = new File([pdfBlob], "attendance.pdf", { type: "application/pdf" });
      await handleFileChange(pdfFile);
    } catch (error) {
      console.error("PDF conversion error:", error);
      toast({
        title: "PDF conversion failed",
        description: "Could not convert images to PDF",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
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
        const docId = objectId("att_doc");
        const extension = "pdf";

        const sanitizedSession = sanitizeForS3Key(sessionType as string);
        const sanitizedDate = (sessionDate as string).replace(/-/g, "_");
        const sanitizedGroup = sanitizeForS3Key(groupName as string);
        const sanitizedName = sanitizeForS3Key(fellowName as string);

        const customFileName = `${sanitizedSession}_${sanitizedDate}_${sanitizedGroup}_${sanitizedName}_${docId}`;

        const s3Key = buildS3Key({
          schoolName: schoolName as string,
          fellowName: fellowName as string,
          groupName: groupName as string,
          sessionType: sessionType as string,
          recordingId: docId,
          extension,
          prefix: "student-attendance",
          customFileName,
        });

        const fileName = `${customFileName}.${extension}`;

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
          onUploadSuccess?.();
          setSelectedFiles([]);
          setPreviewUrls([]);
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
      }
    },
    [
      uploadToS3,
      groupId,
      sessionId,
      schoolName,
      fellowName,
      groupName,
      sessionDate,
      sessionType,
      onUploadSuccess,
      toast,
    ],
  );

  return (
    <div className="space-y-3">
      <FileDropzone
        selectedCount={selectedFiles.length}
        onDrop={handleDrop}
        onInputChange={handleInputChange}
        uploading={uploading}
      />

      {selectedFiles.length > 0 && (
        <div className="grid max-h-28 grid-cols-6 gap-2 overflow-y-auto">
          {selectedFiles.map((file, i) => (
            <div
              key={`${file.name}_${file.size}_${file.lastModified}`}
              className="group relative overflow-hidden rounded-lg border"
            >
              {/* biome-ignore lint/performance/noImgElement: blob URL previews cannot use next/image */}
              <img src={previewUrls[i]} alt={file.name} className="h-12 w-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                disabled={uploading}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Icons.crossCircleFilled className="h-3 w-3" />
              </button>
              <span className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-1 text-xs text-white">
                {file.name}
              </span>
            </div>
          ))}
        </div>
      )}

      <Separator />
      <DialogFooter className="flex justify-end">
        <Button className="text-shamiri-new-blue" variant="ghost" onClick={() => onClose(false)}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={selectedFiles.length === 0 || uploading}
          variant="brand"
          onClick={handleUpload}
          className="bg-shamiri-new-blue"
          loading={uploading}
        >
          {uploading ? "Processing upload..." : "Upload attendance document"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function FileDropzone({
  selectedCount,
  onDrop,
  onInputChange,
  uploading,
}: {
  selectedCount: number;
  onDrop: (e: React.DragEvent<HTMLLabelElement>) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label
        id="drop_zone"
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        className={clsx(
          "mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-3 transition-colors",
          isDragOver ? "border-shamiri-new-blue bg-blue-bg" : "border-gray-200",
          uploading && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex w-full items-center space-x-6">
          <div className="cursor-pointer rounded-lg border border-gray-200 p-2">
            <span className="text-normal cursor-pointer text-center">Select Images</span>
          </div>
          <div className="flex items-center space-x-2">
            <Icons.uploadCloudIcon className="h-6 w-6 text-gray-400" />
            <span className="text-normal text-center text-gray-500">
              {selectedCount > 0
                ? `${selectedCount} file${selectedCount > 1 ? "s" : ""} selected`
                : "Drop images here..."}
            </span>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onInputChange}
        />
      </label>
      <p className="mt-1 text-xs text-gray-500">
        Supports PNG, JPEG, WebP and other image formats. Images are combined into a single PDF.
      </p>
    </div>
  );
}
