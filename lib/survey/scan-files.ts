// What a scanned questionnaire file may be. Shared by the upload form and the upload actions.

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import { MAX_FILE_SIZE } from "#/lib/s3/s3.types";

export const SCAN_CONTENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export type ScanContentType = (typeof SCAN_CONTENT_TYPES)[number];

export const MAX_SCAN_BYTES = MAX_FILE_SIZE;

const EXTENSION_CONTENT_TYPES: Record<string, ScanContentType> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export function isScanContentType(contentType: string): contentType is ScanContentType {
  return (SCAN_CONTENT_TYPES as readonly string[]).includes(contentType);
}

/**
 * The scan type of a file, from the browser's type or, when the browser gives none (as for some
 * files from a network share or scanner app), from its extension.
 */
export function scanContentTypeOf(file: { type: string; name: string }) {
  if (isScanContentType(file.type)) {
    return file.type;
  }
  const browserGaveNoType = file.type === "" || file.type === "application/octet-stream";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return browserGaveNoType ? EXTENSION_CONTENT_TYPES[extension] : undefined;
}

/**
 * Lowercase hex SHA-256 of a file, which the upload is signed with. It reads the file in chunks, so
 * a large scan isn't held in memory whole, as `crypto.subtle.digest` would need.
 */
export async function fileSha256(file: Blob): Promise<string> {
  const hash = sha256.create();
  const reader = file.stream().getReader();
  // oxlint-disable-next-line eslint/no-await-in-loop -- a stream gives its chunks one after another
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    hash.update(chunk.value);
  }
  return bytesToHex(hash.digest());
}
