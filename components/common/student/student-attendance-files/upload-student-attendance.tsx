"use client";

import { useCallback, useEffect, useState } from "react";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { DialogFooter } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { useToast } from "#/components/ui/use-toast";
import {
  createAttendanceDocument,
  getAttendanceDocument,
} from "#/lib/actions/file/student-attendance";
import type { AttendanceDocS3Key } from "#/lib/actions/file/student-attendance/types";
import { useS3Upload } from "#/lib/hooks/use-s3-upload";
import { buildAttendanceS3Key, createAttendancePdf } from "#/lib/utils/attendance-upload";

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
  const { toast } = useToast();
  const { uploadToS3 } = useS3Upload();

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

    const missing: string[] = [];
    if (!schoolName) missing.push("schoolName");
    if (!fellowName) missing.push("fellowName");
    if (!groupName) missing.push("groupName");
    if (!sessionDate) missing.push("sessionDate");
    if (!sessionType) missing.push("sessionType");
    if (!groupId) missing.push("groupId");
    if (!sessionId) missing.push("sessionId");
    if (missing.length > 0) {
      toast({
        title: "Upload failed",
        description: `Missing session data: ${missing.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const filters = { sessionId, groupId };

      const s3KeyFields: AttendanceDocS3Key = {
        schoolName: schoolName as string,
        fellowName: fellowName as string,
        groupName: groupName as string,
        sessionDate: new Date(sessionDate as string),
        sessionType: sessionType as string,
      };

      const existing = await getAttendanceDocument(filters);

      const oldS3Key = existing.data?.link ?? null;
      const existingPdfUrl = existing.data?.presignedUrl ?? null;

      const pdfFile = await createAttendancePdf(existingPdfUrl, selectedFiles);
      const { fileName, s3Key } = buildAttendanceS3Key(s3KeyFields);
      const { key } = await uploadToS3(pdfFile, {
        endpoint: { request: { body: { key: s3Key, bucket: "student-attendance" } } },
      });

      const result = await createAttendanceDocument(
        {
          groupId,
          sessionId,
          fileName,
          link: key,
        },
        oldS3Key,
      );

      if (result.success) {
        onUploadSuccess?.();
        setSelectedFiles([]);
        setPreviewUrls([]);
        toast({ title: "File uploaded successfully" });
      } else {
        toast({
          title: "Upload failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Something went wrong uploading the file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

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
              className="relative group"
            >
              <button
                type="button"
                className="overflow-hidden rounded-lg border w-full"
                onClick={() => setLightboxIndex(i)}
              >
                {/* biome-ignore lint/performance/noImgElement: blob URL previews cannot use next/image */}
                <img src={previewUrls[i]} alt={file.name} className="h-20 w-full object-cover" />
              </button>
              <span className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-1 text-xs text-white pointer-events-none">
                {file.name}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                disabled={uploading}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-shamiri-light-red text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={`Remove ${file.name}`}
              >
                <Icons.crossCircleFilled className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {lightboxIndex !== null && previewUrls[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxIndex(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightboxIndex(null);
          }}
          role="dialog"
          tabIndex={-1}
        >
          <div className="relative">
            {/* biome-ignore lint/performance/noImgElement: blob URL previews cannot use next/image */}
            <img
              src={previewUrls[lightboxIndex]}
              alt={selectedFiles[lightboxIndex]?.name}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label="Close lightbox"
            >
              <Icons.crossCircleFilled className="h-5 w-5" />
            </button>
          </div>
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
