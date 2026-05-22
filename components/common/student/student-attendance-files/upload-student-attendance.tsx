"use client";

import { useCallback, useEffect, useState } from "react";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { DialogFooter } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { useToast } from "#/components/ui/use-toast";
import {
  createStudentAttendanceDocument,
  deleteAttendanceFile,
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
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

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        addFiles(files);
      }
      e.target.value = "";
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

      const oldDocKey = existing.success ? existing.data?.link : undefined;

      let pdfBlob: Blob;
      if (existing.success && existing.data?.presignedUrl) {
        const response = await fetch(existing.data.presignedUrl);
        const existingPdfBytes = await response.arrayBuffer();
        pdfBlob = await appendToPdf(existingPdfBytes, selectedFiles);
      } else {
        pdfBlob = await imagesToPdf(selectedFiles);
      }

      const pdfFile = new File([pdfBlob], "attendance.pdf", { type: "application/pdf" });
      await handleFileChange(pdfFile, oldDocKey);
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
    async (file: File, oldDocKey?: string) => {
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
          if (oldDocKey) {
            deleteAttendanceFile(oldDocKey).catch((err) =>
              console.error("Failed to delete old attendance file:", err),
            );
          }

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
      <div className="flex justify-center">
        <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-shamiri-new-blue bg-blue-bg p-6 transition-colors hover:bg-blue-bg/80">
          <Icons.camera className="h-8 w-8 text-shamiri-new-blue" />
          <span className="mt-2 text-sm font-medium text-shamiri-new-blue">Take Photo</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={handleInputChange}
          />
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto">
          {selectedFiles.map((file, i) => (
            <div
              key={`${file.name}_${file.size}_${file.lastModified}`}
              className="group relative overflow-hidden rounded-lg border cursor-pointer"
              onClick={() => setLightboxIndex(i)}
            >
              {/* biome-ignore lint/performance/noImgElement: blob URL previews cannot use next/image */}
              <img src={previewUrls[i]} alt={file.name} className="h-20 w-full object-cover" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
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

      {lightboxIndex !== null && previewUrls[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          {/* biome-ignore lint/performance/noImgElement: blob URL previews */}
          <img
            src={previewUrls[lightboxIndex]}
            alt={selectedFiles[lightboxIndex]?.name}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <Icons.crossCircleFilled className="h-5 w-5" />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 truncate rounded bg-black/50 px-3 py-1 text-xs text-white">
            {selectedFiles[lightboxIndex]?.name}
          </span>
        </div>
      )}

      <Separator />
      <DialogFooter className="flex justify-end">
        <Button className="text-shamiri-new-blue" variant="ghost" onClick={() => onClose(false)}>
          Cancel
        </Button>
        <Button
          type="button"
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
