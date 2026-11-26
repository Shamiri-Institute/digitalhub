// Comments on a ticket and the files on them. Anyone who can see a ticket may comment on it until it
// closes or is cancelled. Files go straight from the browser to S3 under the commenter's prefix for
// that ticket; the comment only links a file once S3 holds it with an allowed type and size.

import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db, type Transaction } from "#/db/client";
import type { TicketStatus } from "#/db/enums";
import { ticketAttachments, ticketEvents, tickets } from "#/db/schema";
import { NotFoundError } from "#/lib/auth/require-auth-role";
import { objectId } from "#/lib/crypto";
import { getPresignedUploadUrl, getPresignedUrl } from "#/lib/s3/s3.service";
import { PRESIGNED_UPLOAD_TTL_SECONDS } from "#/lib/s3/s3.types";
import { verifyUploadedObject } from "#/lib/s3/utils/verify-upload";
import { canViewTicket } from "#/lib/ticket-access";
import {
  MAX_TICKET_ATTACHMENTS,
  MAX_TICKET_COMMENT_LENGTH,
  ticketAttachmentProblem,
} from "#/lib/ticket-attachment-files";

export const TICKET_ATTACHMENT_URL_TTL_SECONDS = 5 * 60;

export type NewTicketAttachment = { fileName: string; contentType: string; byteSize: number };

export type StartedTicketAttachment = {
  key: string;
  url: string;
  /** Every header the PUT must send; S3 refuses it if one differs. */
  headers: Record<string, string>;
};

export type TicketCommentInput = { body: string; files: { key: string; fileName: string }[] };

const CLOSED_MESSAGE = "This ticket is closed, so no more comments can be added.";

export function ticketTakesComments(status: TicketStatus) {
  return status !== "CLOSED" && status !== "CANCELLED";
}

// The ticket, when the viewer can see it and it still takes comments.
async function commentableTicket(q: Transaction | typeof db, userId: string, ticketId: string) {
  const [ticket] = await q
    .select({ status: tickets.status })
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), canViewTicket(userId)))
    .for("update");
  if (!ticket) throw new NotFoundError("Ticket");
  if (!ticketTakesComments(ticket.status)) throw new Error(CLOSED_MESSAGE);
  return ticket;
}

function assertFileCount(count: number) {
  if (count > MAX_TICKET_ATTACHMENTS) {
    throw new Error(`Attach up to ${MAX_TICKET_ATTACHMENTS} files to a comment.`);
  }
}

// Only the commenter's own uploads for this ticket, so a comment can't link someone else's file.
function uploadPrefix(userId: string, ticketId: string) {
  return `tickets/${ticketId}/${userId}/`;
}

/** Presigns a PUT for each file, or refuses them all when one can't be attached. */
export async function startTicketAttachmentUploads(
  userId: string,
  ticketId: string,
  files: NewTicketAttachment[],
): Promise<StartedTicketAttachment[]> {
  if (files.length === 0) throw new Error("Choose a file to attach.");
  assertFileCount(files.length);
  for (const file of files) {
    const problem = ticketAttachmentProblem(file);
    if (problem) throw new Error(`${file.fileName}: ${problem}`);
  }
  await commentableTicket(db, userId, ticketId);

  return Promise.all(
    files.map(async (file) => {
      const key = `${uploadPrefix(userId, ticketId)}${objectId("ticketattachment")}`;
      const { url, headers } = await getPresignedUploadUrl(
        key,
        "ticket-attachments",
        file.contentType,
        { contentLength: file.byteSize, expiresIn: PRESIGNED_UPLOAD_TTL_SECONDS },
      );
      return { key, url, headers };
    }),
  );
}

// shortcut: abandoned uploads are never deleted; add a lifecycle rule or sweep if the bucket grows.
/**
 * Adds a comment with the files already uploaded for it. A file that was uploaded but never posted
 * stays in S3, linked to nothing.
 */
export async function addTicketComment(
  userId: string,
  ticketId: string,
  input: TicketCommentInput,
) {
  const body = input.body.trim();
  if (body.length > MAX_TICKET_COMMENT_LENGTH) {
    throw new Error(`Comments can be up to ${MAX_TICKET_COMMENT_LENGTH} characters.`);
  }
  if (!body && input.files.length === 0) throw new Error("Write a comment or attach a file.");
  assertFileCount(input.files.length);
  const prefix = uploadPrefix(userId, ticketId);
  if (new Set(input.files.map((file) => file.key)).size !== input.files.length) {
    throw new Error("The same file is attached twice.");
  }

  const files = await Promise.all(
    input.files.map(async ({ key, fileName }) => {
      const fileId = key.slice(prefix.length);
      if (!key.startsWith(prefix) || fileId === "" || fileId.includes("/")) {
        throw new Error(`${fileName}: this file wasn't uploaded for this ticket.`);
      }
      const stored = await verifyUploadedObject(key, "ticket-attachments");
      if (stored.status !== "ok") {
        throw new Error(`${fileName} didn't finish uploading. Remove it and try again.`);
      }
      const file = { contentType: stored.contentType ?? "", byteSize: stored.contentLength };
      const problem = ticketAttachmentProblem(file);
      if (problem) throw new Error(`${fileName}: ${problem}`);
      return { s3Key: key, fileName, ...file };
    }),
  );

  await db.transaction(async (tx) => {
    await commentableTicket(tx, userId, ticketId);
    const [event] = await tx
      .insert(ticketEvents)
      .values({ ticketId, kind: "COMMENTED", actorId: userId, reason: body || null })
      .returning({ id: ticketEvents.id });
    if (!event) throw new Error("The comment wasn't saved");
    if (files.length > 0) {
      await tx.insert(ticketAttachments).values(
        files.map((file) => ({
          ...file,
          ticketId,
          eventId: event.id,
          uploadedById: userId,
        })),
      );
    }
  });
}

/** Hides the viewer's own comment and its files from everyone. It can't be undone. */
export async function hideTicketComment(userId: string, eventId: string) {
  await db.transaction(async (tx) => {
    const [comment] = await tx
      .select({
        ticketId: ticketEvents.ticketId,
        actorId: ticketEvents.actorId,
        archivedAt: ticketEvents.archivedAt,
      })
      .from(ticketEvents)
      .innerJoin(tickets, eq(tickets.id, ticketEvents.ticketId))
      .where(
        and(
          eq(ticketEvents.id, eventId),
          eq(ticketEvents.kind, "COMMENTED"),
          canViewTicket(userId),
        ),
      );
    if (!comment) throw new NotFoundError("Comment");
    if (comment.actorId !== userId) throw new Error("Only the comment's author can hide it");
    await commentableTicket(tx, userId, comment.ticketId);
    const [hidden] = await tx
      .update(ticketEvents)
      .set({ archivedAt: new Date(), archivedById: userId })
      .where(and(eq(ticketEvents.id, eventId), isNull(ticketEvents.archivedAt)))
      .returning({ id: ticketEvents.id });
    if (!hidden) throw new Error("This comment is already hidden");
  });
}

/** A short-lived link to a file on a comment the viewer can still see. */
export async function ticketAttachmentUrl(userId: string, attachmentId: string) {
  const [attachment] = await db
    .select({ s3Key: ticketAttachments.s3Key })
    .from(ticketAttachments)
    .innerJoin(ticketEvents, eq(ticketEvents.id, ticketAttachments.eventId))
    .innerJoin(tickets, eq(tickets.id, ticketAttachments.ticketId))
    .where(
      and(
        eq(ticketAttachments.id, attachmentId),
        isNull(ticketEvents.archivedAt),
        canViewTicket(userId),
      ),
    );
  if (!attachment) throw new NotFoundError("File");
  return getPresignedUrl(attachment.s3Key, "ticket-attachments", TICKET_ATTACHMENT_URL_TTL_SECONDS);
}
