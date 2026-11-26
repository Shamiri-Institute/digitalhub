// What a file on a ticket comment may be. Shared by the comment form and the comment actions.

import { normalizeContentType } from "#/lib/s3/utils/normalize-content-type";

export const TICKET_ATTACHMENT_EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
} as const;
export type TicketAttachmentContentType = keyof typeof TICKET_ATTACHMENT_EXTENSIONS;

export const MAX_TICKET_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_TICKET_ATTACHMENTS = 5;
export const MAX_TICKET_COMMENT_LENGTH = 2000;

/** For the file picker's `accept`. */
export const TICKET_ATTACHMENT_ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf";

const EXTENSION_CONTENT_TYPES: Record<string, TicketAttachmentContentType> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
};

export function isTicketAttachmentContentType(
  contentType: string,
): contentType is TicketAttachmentContentType {
  return Object.hasOwn(TICKET_ATTACHMENT_EXTENSIONS, contentType);
}

/**
 * The attachment type of a file, from the browser's type or, when the browser gives none, from its
 * extension. Undefined for a file that can't be attached.
 */
export function ticketAttachmentContentTypeOf(file: { type: string; name: string }) {
  const browserType = normalizeContentType(file.type);
  if (isTicketAttachmentContentType(browserType)) {
    return browserType;
  }
  const browserGaveNoType = browserType === "" || browserType === "application/octet-stream";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return browserGaveNoType && Object.hasOwn(EXTENSION_CONTENT_TYPES, extension)
    ? EXTENSION_CONTENT_TYPES[extension]
    : undefined;
}

/** Why a file can't be attached, or null when it can. */
export function ticketAttachmentProblem(file: { contentType: string; byteSize: number }) {
  if (!isTicketAttachmentContentType(file.contentType)) {
    return "Only PNG, JPEG, WebP or PDF files can be attached.";
  }
  if (file.byteSize <= 0) {
    return "This file is empty.";
  }
  if (file.byteSize > MAX_TICKET_ATTACHMENT_BYTES) {
    return "Files can be up to 10 MB.";
  }
  return null;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
