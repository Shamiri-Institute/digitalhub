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

      // Use application/octet-stream as fallback for files with unknown MIME types
      const contentType = file.type || "application/octet-stream";

      const presignedResponse = await fetch("/api/s3/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, key: target.key, bucket: target.bucket }),
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
