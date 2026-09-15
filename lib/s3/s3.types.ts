import { z } from "zod";

export const S3_BUCKETS = ["recordings", "student-attendance"] as const;

export type S3Bucket = (typeof S3_BUCKETS)[number];

export const S3ApiRequestSchema = z.object({
  bucket: z.enum(S3_BUCKETS),
  contentType: z.string().min(1).max(255),
  size: z.number().int().positive(),
  groupId: z.string().min(1),
  sessionId: z.string().min(1),
  uploaderId: z.string().min(1),
});

export type S3ApiRequest = z.infer<typeof S3ApiRequestSchema>;

export type S3AuthParams = Omit<S3ApiRequest, "bucket">;

export type UploadTarget =
  | {
      bucket: "recordings";
      key: string;
      fileName: string;
      contentType: string;
      recordingId: string;
      context: {
        recordingId: string;
        fellowId: string;
        groupId: string;
        sessionId: string;
        schoolId: string;
        fileName: string;
      };
    }
  | {
      bucket: "student-attendance";
      key: string;
      fileName: string;
      contentType: string;
      context: {
        groupId: string;
        sessionId: string;
        fellowId: string;
      };
    };

export type IssuedUpload =
  | {
      bucket: "recordings";
      url: string;
      key: string;
      s3Bucket: string;
      fileName: string;
      token: string;
      recordingId: string;
    }
  | {
      bucket: "student-attendance";
      url: string;
      key: string;
      s3Bucket: string;
      fileName: string;
      token: string;
    };

export interface BucketConfig {
  bucket: string;
  region: string;
}

export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
}

export interface PresignedUploadOptions {
  contentLength?: number;
  expiresIn?: number;
}

export const RecordingsS3KeySchema = z.object({
  schoolName: z.string().min(1, "schoolName is required"),
  fellowName: z.string().min(1, "fellowName is required"),
  groupName: z.string().min(1, "groupName is required"),
  sessionType: z.string().min(1, "sessionType is required"),
  recordingId: z.string().min(1, "recordingId is required"),
  extension: z.string().min(1, "extension is required"),
  prefix: z.string().min(1, "prefix must not be empty").optional(),
  customFileName: z.string().min(1, "customFileName must not be empty").optional(),
});

export type RecordingsS3KeyParams = z.infer<typeof RecordingsS3KeySchema>;

export const AttendanceS3KeySchema = z.object({
  schoolName: z.string().min(1, "schoolName is required"),
  fellowName: z.string().min(1, "fellowName is required"),
  groupName: z.string().min(1, "groupName is required"),
  sessionDate: z.date({ message: "sessionDate must be a valid Date" }),
  sessionType: z.string().min(1, "sessionType is required"),
});

export type AttendanceS3KeyParams = z.infer<typeof AttendanceS3KeySchema>;

export const StorageKeySchema = z.object({
  segments: z
    .array(z.string().min(1, "each segment must not be empty"))
    .min(1, "at least one segment is required"),
  fileName: z.string().min(1, "fileName is required"),
});

export const MAX_SEGMENT_LENGTH = 50;

export const PRESIGNED_UPLOAD_TTL_SECONDS = 15 * 60;

export const UPLOAD_TOKEN_TTL_SECONDS = 60 * 60;

export type StorageKeyParams = z.infer<typeof StorageKeySchema>;

export const MAX_FILE_SIZE = 500 * 1024 * 1024;

export const RECORDINGS_CONTENT_TYPE_EXTENSION = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/x-m4a": "m4a",
  "audio/mp4": "m4a",
  "video/mp4": "mp4",
  "audio/aac": "m4a",
} as const satisfies Record<string, string>;

export type RecordingContentType = keyof typeof RECORDINGS_CONTENT_TYPE_EXTENSION;

export const RECORDINGS_ALLOWED_CONTENT_TYPES = Object.keys(
  RECORDINGS_CONTENT_TYPE_EXTENSION,
) as RecordingContentType[];

export const ALLOWED_EXTENSIONS = Array.from(
  new Set(Object.values(RECORDINGS_CONTENT_TYPE_EXTENSION)),
).map((extension) => `.${extension}`);

export function extensionForRecordingContentType(contentType: string): string | null {
  return RECORDINGS_CONTENT_TYPE_EXTENSION[contentType as RecordingContentType] ?? null;
}
