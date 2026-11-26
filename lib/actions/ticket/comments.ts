"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { ImplementerRole } from "#/db/enums";
import {
  ForbiddenRoleError,
  NotFoundError,
  requireAuthRole,
  UnauthenticatedError,
} from "#/lib/auth/require-auth-role";
import { MAX_TICKET_ATTACHMENTS, MAX_TICKET_COMMENT_LENGTH } from "#/lib/ticket-attachment-files";
import {
  addTicketComment as addComment,
  hideTicketComment as hideComment,
  type NewTicketAttachment,
  type StartedTicketAttachment,
  startTicketAttachmentUploads as startUploads,
  ticketAttachmentUrl,
  TicketCommentError,
} from "#/lib/ticket-comments";
import type { ActionResponse } from "#/types/actions.types";

const FileNameSchema = z.string().trim().min(1).max(255);

const NewAttachmentsSchema = z
  .array(
    z.object({
      fileName: FileNameSchema,
      contentType: z.string().max(255),
      byteSize: z.number().int(),
    }) satisfies z.ZodType<NewTicketAttachment>,
  )
  .max(MAX_TICKET_ATTACHMENTS);

const CommentSchema = z.object({
  body: z.string().max(MAX_TICKET_COMMENT_LENGTH),
  files: z
    .array(z.object({ key: z.string().min(1).max(512), fileName: FileNameSchema }))
    .max(MAX_TICKET_ATTACHMENTS),
});

async function callerUserId() {
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
    if (
      error instanceof TicketCommentError ||
      error instanceof NotFoundError ||
      error instanceof ForbiddenRoleError ||
      error instanceof UnauthenticatedError
    ) {
      return { success: false, message: error.message };
    }
    console.error(error);
    return { success: false, message: "Something went wrong. Please try again." };
  }
}

export async function startTicketAttachmentUploads(
  ticketId: string,
  files: z.input<typeof NewAttachmentsSchema>,
): Promise<ActionResponse<StartedTicketAttachment[]>> {
  return respond("Upload started", async () =>
    startUploads(await callerUserId(), ticketId, NewAttachmentsSchema.parse(files)),
  );
}

export async function addTicketComment(
  ticketId: string,
  input: z.input<typeof CommentSchema>,
): Promise<ActionResponse> {
  return respond("Comment added", async () => {
    await addComment(await callerUserId(), ticketId, CommentSchema.parse(input));
    refresh();
  });
}

export async function hideTicketComment(eventId: string): Promise<ActionResponse> {
  return respond("Comment hidden", async () => {
    await hideComment(await callerUserId(), eventId);
    refresh();
  });
}

export async function getTicketAttachmentUrl(
  attachmentId: string,
): Promise<ActionResponse<string>> {
  return respond("Link ready", async () => ticketAttachmentUrl(await callerUserId(), attachmentId));
}
