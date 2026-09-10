"use client";

import type React from "react";
import { useCallback, useRef, useState } from "react";

import { S3_BUCKETS, type S3Bucket } from "#/lib/s3-buckets";

export interface UploadTarget {
  key: string;
  bucket: S3Bucket;
}

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export interface FileProgress {
  file: File;
  progress: number;
  uploaded: number;
  size: number;
  id: string;
}

interface FileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange?: (file: File) => void;
  ref?: React.Ref<HTMLInputElement>;
}

function FileInputComponent({ onChange, ...props }: FileInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onChange) {
      onChange(file);
    }
  };

  return <input {...props} type="file" onChange={handleInputChange} />;
}

// The route allowlist is exact MIME. Empty / octet-stream is common for audio
// picked from disk; map the extension so a valid recording still mints.
const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  wave: "audio/wav",
  m4a: "audio/x-m4a",
  mp4: "audio/mp4",
  aac: "audio/aac",
  pdf: "application/pdf",
};

function resolveUploadContentType(file: File): string {
  const declared = file.type.toLowerCase().split(";")[0]?.trim() ?? "";
  if (declared && declared !== "application/octet-stream") {
    return declared;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && EXTENSION_CONTENT_TYPES[ext]) {
    return EXTENSION_CONTENT_TYPES[ext];
  }
  return declared || "application/octet-stream";
}

/**
 * S3 upload hook using presigned URLs with progress tracking.
 */
export function useS3Upload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileProgress[]>([]);

  const addFile = useCallback((file: File) => {
    setFiles((prev) => [
      ...prev,
      {
        file,
        progress: 0,
        uploaded: 0,
        size: file.size,
        id: crypto.randomUUID(),
      },
    ]);
  }, []);

  const updateFileProgress = useCallback((file: File, uploaded: number) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.file === file
          ? {
              ...f,
              uploaded,
              progress: f.size ? (uploaded / f.size) * 100 : 0,
            }
          : f,
      ),
    );
  }, []);

  const openFileDialog = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  const uploadToS3 = useCallback(
    async (file: File, target: UploadTarget): Promise<UploadResult> => {
      if (!S3_BUCKETS.includes(target?.bucket)) {
        throw new Error(
          `uploadToS3 requires an explicit bucket (${S3_BUCKETS.join(" or ")}); received ${String(target?.bucket)}`,
        );
      }
      if (!target.key) {
        throw new Error("uploadToS3 requires an explicit object key");
      }

      // Browsers often send an empty type (or octet-stream) for a valid .mp3.
      // The route allowlist is exact MIME, so infer from the extension rather
      // than minting a URL that S3 / the route will then reject.
      const contentType = resolveUploadContentType(file);

      // size is signed into the URL, so the PUT body must be exactly this long.
      const presignedResponse = await fetch("/api/s3/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          key: target.key,
          bucket: target.bucket,
          size: file.size,
        }),
      });

      if (!presignedResponse.ok) {
        const error = await presignedResponse.json().catch(() => ({}));
        throw new Error(error.error ?? "Failed to get presigned URL");
      }

      const { url, key, bucket: bucketName } = await presignedResponse.json();

      // Track this file
      addFile(file);

      // Upload to S3 using presigned URL with progress tracking
      // Send File directly (not ArrayBuffer) to allow streaming without loading into memory
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            updateFileProgress(file, event.loaded);
          }
        };

        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              updateFileProgress(file, file.size);
              resolve();
            } else {
              console.error("Upload failed:", {
                status: xhr.status,
                statusText: xhr.statusText,
                response: xhr.responseText,
              });
              reject(new Error(`Upload failed: ${xhr.status} - ${xhr.responseText}`));
            }
          }
        };

        xhr.onerror = () => {
          console.error("XHR Error:", xhr.status, xhr.statusText);
          reject(new Error(`Network error: ${xhr.status} ${xhr.statusText}`));
        };

        xhr.open("PUT", url, true);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.setRequestHeader("Cache-Control", "max-age=630720000");
        xhr.setRequestHeader("If-None-Match", "*");
        xhr.send(file);
      });

      return {
        url: `https://${bucketName}.s3.amazonaws.com/${key}`,
        key,
        bucket: bucketName,
      };
    },
    [addFile, updateFileProgress],
  );

  const FileInput = useCallback((props: Omit<FileInputProps, "ref">) => {
    return <FileInputComponent {...props} ref={fileInputRef} style={{ display: "none" }} />;
  }, []);

  return {
    uploadToS3,
    FileInput,
    openFileDialog,
    files,
  };
}

export default useS3Upload;
