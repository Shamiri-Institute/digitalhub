import { z } from "zod";

/**
 * Zod schema for recording upload form validation
 */
export const RecordingUploadSchema = z.object({
  fellowId: z.string().min(1, "Fellow is required"),
  groupId: z.string().min(1, "Intervention group is required"),
  sessionId: z.string().min(1, "Session is required"),
  schoolId: z.string().min(1, "School is required"),
});

export type RecordingUploadFormData = z.infer<typeof RecordingUploadSchema>;

/**
 * Allowed audio MIME types
 */
export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg", // mp3
  "audio/wav", // wav
  "audio/wave", // wav alternate
  "audio/x-wav", // wav alternate
  "audio/x-m4a", // m4a
  "audio/mp4", // m4a/mp4
  "video/mp4", // mp4 (can contain audio)
  "audio/aac", // aac
] as const;

/**
 * Allowed file extensions
 */
export const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".m4a", ".mp4"] as const;

/**
 * Maximum file size in bytes (500MB)
 */
export const MAX_FILE_SIZE = 500 * 1024 * 1024;

/**
 * Magic bytes patterns for audio file validation
 * These are the first bytes of valid audio files
 */
const MAGIC_BYTES: Record<string, readonly (readonly number[])[]> = {
  // MP3 files start with ID3 tag or sync word
  mp3: [
    [0x49, 0x44, 0x33], // ID3 tag header
    [0xff, 0xfb], // MP3 sync word (MPEG Audio Layer 3)
    [0xff, 0xfa], // MP3 sync word variant
    [0xff, 0xf3], // MP3 sync word variant
    [0xff, 0xf2], // MP3 sync word variant
  ],
  // WAV files start with RIFF header
  wav: [[0x52, 0x49, 0x46, 0x46]], // "RIFF"
  // M4A/MP4 files have ftyp box
  m4a: [[0x00, 0x00, 0x00]], // ftyp box (variable size prefix)
  mp4: [[0x00, 0x00, 0x00]], // ftyp box (variable size prefix)
};

/**
 * Result of file validation
 */
export type FileValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Validate audio file type and size
 */
export function validateAudioFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    return {
      valid: false,
      error: `File size (${sizeMB}MB) exceeds maximum allowed size (500MB)`,
    };
  }

  // Check MIME type
  const isValidType = ALLOWED_AUDIO_TYPES.some((type) => file.type === type);

  if (!isValidType) {
    // Check file extension as fallback
    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    const isValidExtension = ALLOWED_EXTENSIONS.some((ext) => ext === extension);

    if (!isValidExtension) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Read the first bytes of a file
 */
async function readFileHeader(file: File, bytes: number): Promise<Uint8Array> {
  const slice = file.slice(0, bytes);
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Check if header matches any of the magic byte patterns
 */
function matchesMagicBytes(header: Uint8Array, patterns: readonly (readonly number[])[]): boolean {
  return patterns.some((pattern) => {
    for (let i = 0; i < pattern.length; i++) {
      if (header[i] !== pattern[i]) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Validate audio file magic bytes to verify file content
 * This provides additional security against renamed files
 */
export async function validateAudioMagicBytes(file: File): Promise<FileValidationResult> {
  try {
    // Read first 12 bytes (enough for most signatures)
    const header = await readFileHeader(file, 12);

    // Get file extension
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!extension) {
      return {
        valid: false,
        error: "File has no extension",
      };
    }

    // Check based on extension
    switch (extension) {
      case "mp3": {
        const mp3Patterns = MAGIC_BYTES.mp3;
        if (!mp3Patterns || !matchesMagicBytes(header, mp3Patterns)) {
          return {
            valid: false,
            error: "File does not appear to be a valid MP3 file",
          };
        }
        break;
      }

      case "wav": {
        const wavPatterns = MAGIC_BYTES.wav;
        if (!wavPatterns || !matchesMagicBytes(header, wavPatterns)) {
          return {
            valid: false,
            error: "File does not appear to be a valid WAV file",
          };
        }
        // Additional check: WAV files should have "WAVE" at bytes 8-11
        const byte8 = header[8] ?? 0;
        const byte9 = header[9] ?? 0;
        const byte10 = header[10] ?? 0;
        const byte11 = header[11] ?? 0;
        const waveMarker = String.fromCharCode(byte8, byte9, byte10, byte11);
        if (waveMarker !== "WAVE") {
          return {
            valid: false,
            error: "File does not appear to be a valid WAV file",
          };
        }
        break;
      }

      case "m4a":
      case "mp4": {
        // M4A/MP4 files have ftyp box - check for "ftyp" at bytes 4-7
        const byte4 = header[4] ?? 0;
        const byte5 = header[5] ?? 0;
        const byte6 = header[6] ?? 0;
        const byte7 = header[7] ?? 0;
        const ftypMarker = String.fromCharCode(byte4, byte5, byte6, byte7);
        if (ftypMarker !== "ftyp") {
          return {
            valid: false,
            error: `File does not appear to be a valid ${extension.toUpperCase()} file`,
          };
        }
        break;
      }

      default:
        return {
          valid: false,
          error: `Unsupported file extension: ${extension}`,
        };
    }

    return { valid: true };
  } catch (error) {
    console.error("Error validating file magic bytes:", error);
    return {
      valid: false,
      error: "Failed to validate file content",
    };
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  const lastPart = parts[parts.length - 1];
  return parts.length > 1 && lastPart ? lastPart.toLowerCase() : "";
}
