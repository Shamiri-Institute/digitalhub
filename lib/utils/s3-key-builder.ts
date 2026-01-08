/**
 * S3 Key Builder Utilities
 *
 * Provides functions to build safe, readable S3 keys for session recordings.
 */

/**
 * Maximum length for each segment of the S3 key
 */
const MAX_SEGMENT_LENGTH = 50;

/**
 * Sanitize a string for use in an S3 key
 * - Converts to lowercase
 * - Removes special characters except alphanumeric, hyphens, and underscores
 * - Replaces spaces with underscores
 * - Limits length to prevent excessively long keys
 */
export function sanitizeForS3Key(name: string): string {
  return (
    name
      .toLowerCase()
      // Replace spaces with underscores
      .replace(/\s+/g, "_")
      // Remove any character that isn't alphanumeric, hyphen, or underscore
      .replace(/[^a-z0-9_-]/g, "")
      // Remove consecutive underscores
      .replace(/_+/g, "_")
      // Remove leading/trailing underscores
      .replace(/^_|_$/g, "")
      // Limit length
      .substring(0, MAX_SEGMENT_LENGTH)
  );
}

/**
 * Parameters for building an S3 key for session recordings
 */
export interface S3KeyParams {
  /** Name of the school */
  schoolName: string;
  /** Name of the fellow */
  fellowName: string;
  /** Name of the intervention group */
  groupName: string;
  /** Type of session (e.g., "Session 1", "Session 2") */
  sessionType: string;
  /** Unique recording ID (e.g., "rec_xxxxx") */
  recordingId: string;
  /** File extension (e.g., "mp3", "wav") */
  extension: string;
}

/**
 * Build a complete S3 key for a session recording
 *
 * Format: recordings/{year}/{month}/{school_name}/{fellow_name}/{group_name}/{session_type}_{recording_id}.{ext}
 *
 * @example
 * buildS3Key({
 *   schoolName: "Nairobi Primary School",
 *   fellowName: "John Doe",
 *   groupName: "Group A",
 *   sessionType: "Session 1",
 *   recordingId: "rec_abc123xyz",
 *   extension: "mp3"
 * })
 * // Returns: "recordings/2024/01/nairobi_primary_school/john_doe/group_a/session_1_rec_abc123xyz.mp3"
 */
export function buildS3Key(params: S3KeyParams): string {
  const { schoolName, fellowName, groupName, sessionType, recordingId, extension } = params;

  // Get current date for year/month path
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  // Sanitize all name segments
  const sanitizedSchool = sanitizeForS3Key(schoolName);
  const sanitizedFellow = sanitizeForS3Key(fellowName);
  const sanitizedGroup = sanitizeForS3Key(groupName);
  const sanitizedSession = sanitizeForS3Key(sessionType);

  // Clean extension (remove leading dot if present)
  const cleanExtension = extension.replace(/^\./, "").toLowerCase();

  // Build the key
  const key = [
    "recordings",
    year,
    month,
    sanitizedSchool,
    sanitizedFellow,
    sanitizedGroup,
    `${sanitizedSession}_${recordingId}.${cleanExtension}`,
  ].join("/");

  return key;
}

/**
 * Extract recording ID from an S3 key
 */
export function extractRecordingIdFromKey(s3Key: string): string | null {
  // Key format: recordings/YYYY/MM/school/fellow/group/session_type_rec_xxxxx.ext
  const match = s3Key.match(/(rec_[a-z0-9]+)\.[a-z0-9]+$/i);
  return match?.[1] ?? null;
}

/**
 * Generate a filename for the recording
 * Format: {session_type}_{recording_id}.{ext}
 */
export function generateRecordingFilename(
  sessionType: string,
  recordingId: string,
  extension: string,
): string {
  const sanitizedSession = sanitizeForS3Key(sessionType);
  const cleanExtension = extension.replace(/^\./, "").toLowerCase();
  return `${sanitizedSession}_${recordingId}.${cleanExtension}`;
}
