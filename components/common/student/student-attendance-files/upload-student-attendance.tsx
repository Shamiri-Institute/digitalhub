"use client";

import { useEffect, useRef, useState } from "react";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { DialogFooter } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { toastOnError, useToast } from "#/components/ui/use-toast";
import {
  createAttendanceDocument,
  getAttendanceDocument,
} from "#/lib/actions/file/student-attendance";
import { NO_ATTENDANCE_DOCUMENT_MESSAGE } from "#/lib/actions/file/student-attendance/types";
import { useS3Upload } from "#/lib/hooks/use-s3-upload";
import { createAttendancePdf } from "#/lib/utils/attendance-upload";

export default function UploadStudentAttendanceDocument({
  groupId,
  sessionId,
  onClose,
  onUploadSuccess,
}: {
  groupId: string;
  sessionId: string;
  onClose: (val: boolean) => void;
  onUploadSuccess?: () => void;
}) {
  const [photos, setPhotos] = useState<{ file: File; previewUrl: string }[]>([]);
  const unrevokedPreviewUrls = useRef(new Set<string>());
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const { uploadToS3 } = useS3Upload();

  // effect: revokes the preview object URLs still in use on unmount
  useEffect(() => {
    const previewUrls = unrevokedPreviewUrls.current;
    return () => {
      previewUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const revokePreview = (previewUrl: string) => {
    URL.revokeObjectURL(previewUrl);
    unrevokedPreviewUrls.current.delete(previewUrl);
  };

  const addFiles = (files: File[]) => {
    const added = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    added.forEach(({ previewUrl }) => unrevokedPreviewUrls.current.add(previewUrl));
    setPhotos((prev) => [...prev, ...added]);
  };

  const removeFile = (index: number) => {
    const removed = photos[index];
    if (removed) revokePreview(removed.previewUrl);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addFiles(files);
    }
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (photos.length === 0) {
      toast({ title: "No files selected", variant: "destructive" });
      return;
    }

    const missing: string[] = [];
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

      const existing = await getAttendanceDocument(filters);

      let existingPdfUrl: string | null;
      let expectedActiveDocId: string | null;
      if (existing.success) {
        existingPdfUrl = existing.data?.presignedUrl ?? null;
        expectedActiveDocId = existing.data?.id ?? null;
      } else if (existing.message === NO_ATTENDANCE_DOCUMENT_MESSAGE) {
        existingPdfUrl = null;
        expectedActiveDocId = null;
      } else {
        throw new Error(
          existing.message ??
            "Could not verify the existing attendance document. Please try again.",
        );
      }

      const pdfFile = await createAttendancePdf(
        existingPdfUrl,
        photos.map(({ file }) => file),
      );
      const { key, token } = await uploadToS3(pdfFile, {
        bucket: "student-attendance",
        groupId,
        sessionId,
      });

      if (!key || !token) {
        throw new Error("Upload failed - no key returned");
      }

      const result = await createAttendanceDocument({
        groupId,
        sessionId,
        link: key,
        token,
        expectedActiveDocId,
      });

      if (result.success) {
        onUploadSuccess?.();
        photos.forEach(({ previewUrl }) => revokePreview(previewUrl));
        setPhotos([]);
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
      <div className="flex items-start gap-4">
        <div className="flex shrink-0 justify-center">
          <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-shamiri-new-blue bg-blue-bg p-6 transition-colors hover:bg-blue-bg/80">
            <Icons.camera className="h-8 w-8 text-shamiri-new-blue" />
            <span className="mt-2 text-sm font-medium text-shamiri-new-blue">Take Photo</span>
            <input
              aria-label="Attendance photos"
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={handleInputChange}
            />
          </label>
        </div>
        <div className="mt-2 space-y-1 text-xs text-shamiri-text-grey">
          <p className="font-medium">Instructions:</p>
          <p>- Take a picture of all the pages</p>
          <p>- Ensure the pictures are visible and clear</p>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto">
          {photos.map(({ file, previewUrl }, i) => (
            <div key={`${file.name}_${file.size}_${file.lastModified}`} className="relative group">
              <button
                type="button"
                className="overflow-hidden rounded-lg border w-full"
                onClick={() => setLightboxIndex(i)}
              >
                {/* oxlint-disable-next-line nextjs/no-img-element -- blob URL previews cannot use next/image */}
                <img src={previewUrl} alt={file.name} className="h-20 w-full object-cover" />
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
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-shamiri-light-red text-white"
                aria-label={`Remove ${file.name}`}
              >
                <Icons.crossCircleFilled className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {lightboxIndex !== null && photos[lightboxIndex] && (
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- click-away backdrop
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxIndex(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightboxIndex(null);
          }}
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- native <dialog> UA styles conflict with the overlay
          role="dialog"
          tabIndex={-1}
        >
          <div className="relative">
            {/* oxlint-disable-next-line nextjs/no-img-element -- blob URL previews cannot use next/image */}
            <img
              src={photos[lightboxIndex].previewUrl}
              alt={photos[lightboxIndex].file.name}
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
            {photos[lightboxIndex].file.name}
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
          disabled={photos.length === 0 || uploading}
          variant="brand"
          onClick={toastOnError(handleUpload)}
          className="bg-shamiri-new-blue"
          loading={uploading}
        >
          {uploading ? "Processing upload..." : "Upload"}
        </Button>
      </DialogFooter>
    </div>
  );
}
