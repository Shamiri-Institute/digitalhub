"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { ImplementerRole } from "#/db/enums";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { MAX_TICKET_ATTACHMENTS, MAX_TICKET_COMMENT_LENGTH } from "#/lib/ticket-attachment-files";
import {
  addTicketComment as addComment,
  hideTicketComment as hideComment,
  type StartedTicketAttachment,
  startTicketAttachmentUploads as startUploads,
  ticketAttachmentUrl,
} from "#/lib/ticket-comments";
import type { ActionResponse } from "#/types/actions.types";

const FileNameSchema = z.string().trim().min(1).max(255);

const NewAttachmentsSchema = z
  .array(
    z.object({
      fileName: FileNameSchema,
      contentType: z.string().max(255),
      byteSize: z.number().int(),
    }),
  )
  .max(MAX_TICKET_ATTACHMENTS);

const CommentSchema = z.object({
  body: z.string().max(MAX_TICKET_COMMENT_LENGTH),
  files: z
    .array(z.object({ key: z.string().min(1).max(512), fileName: FileNameSchema }))
    .max(MAX_TICKET_ATTACHMENTS),
});

async function viewerId() {
  return (await requireAuthRole(...Object.values(ImplementerRole))).userId;
}

async function respond<T>(
  successMessage: string,
  run: () => Promise<T>,
): Promise<ActionResponse<T>> {
  try {
    return { success: true, message: successMessage, data: await run() };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Something about this comment isn't valid" };
    }
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function startTicketAttachmentUploads(
  ticketId: string,
  files: z.input<typeof NewAttachmentsSchema>,
): Promise<ActionResponse<StartedTicketAttachment[]>> {
  return respond("Upload started", async () =>
    startUploads(await viewerId(), ticketId, NewAttachmentsSchema.parse(files)),
  );
}

export async function addTicketComment(
  ticketId: string,
  input: z.input<typeof CommentSchema>,
): Promise<ActionResponse> {
  return respond("Comment added", async () => {
    await addComment(await viewerId(), ticketId, CommentSchema.parse(input));
    refresh();
  });
}

export async function hideTicketComment(eventId: string): Promise<ActionResponse> {
  return respond("Comment hidden", async () => {
    await hideComment(await viewerId(), eventId);
    refresh();
  });
}

export async function getTicketAttachmentUrl(
  attachmentId: string,
): Promise<ActionResponse<string>> {
  return respond("Link ready", async () => ticketAttachmentUrl(await viewerId(), attachmentId));
}
