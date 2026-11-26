// @vitest-environment node
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { and, asc, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "#/db/client";
import { implementerMember, ticketAttachments, ticketEvents, tickets } from "#/db/schema";
import { getBucket } from "#/lib/s3/s3.config";
import { deleteObject, getS3Client } from "#/lib/s3/s3.service";
import { MAX_TICKET_ATTACHMENT_BYTES } from "#/lib/ticket-attachment-files";
import {
  addTicketComment,
  hideTicketComment,
  startTicketAttachmentUploads,
  ticketAttachmentUrl,
} from "#/lib/ticket-comments";

let creator: string;
let holder: string;
let outsider: string;
const ticketIds: string[] = [];

const png = { fileName: "photo.png", contentType: "image/png", byteSize: 4 };
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

beforeAll(async () => {
  const members = await db
    .selectDistinct({ userId: implementerMember.userId })
    .from(implementerMember)
    .orderBy(asc(implementerMember.userId))
    .limit(3);
  const [a, b, c] = members;
  if (!a || !b || !c) throw new Error("Seed the database first");
  creator = a.userId;
  holder = b.userId;
  outsider = c.userId;
});

afterAll(async () => {
  if (ticketIds.length === 0) return;
  const files = await db
    .select({ s3Key: ticketAttachments.s3Key })
    .from(ticketAttachments)
    .where(inArray(ticketAttachments.ticketId, ticketIds));
  await Promise.all(files.map(({ s3Key }) => deleteObject({ Key: s3Key }, "ticket-attachments")));
  await db.delete(ticketAttachments).where(inArray(ticketAttachments.ticketId, ticketIds));
  await db.delete(ticketEvents).where(inArray(ticketEvents.ticketId, ticketIds));
  await db.delete(tickets).where(inArray(tickets.id, ticketIds));
});

/** A ticket the creator raised and sent to the holder; the outsider has no part in it. */
async function newTicket() {
  const [ticket] = await db
    .insert(tickets)
    .values({
      createdById: creator,
      holderId: holder,
      subject: "Raised by the ticket comment tests",
      description: "Raised by the ticket comment tests.",
      category: "TECH",
    })
    .returning({ id: tickets.id });
  if (!ticket) throw new Error("ticket not created");
  ticketIds.push(ticket.id);
  await db.insert(ticketEvents).values({
    ticketId: ticket.id,
    kind: "CREATED",
    actorId: creator,
    assigneeId: holder,
  });
  return ticket.id;
}

async function uploadPng(userId: string, ticketId: string) {
  const [started] = await startTicketAttachmentUploads(userId, ticketId, [png]);
  if (!started) throw new Error("no upload started");
  const response = await fetch(started.url, {
    method: "PUT",
    headers: started.headers,
    body: pngBytes,
  });
  expect(response.ok).toBe(true);
  return started.key;
}

async function commentsOn(ticketId: string) {
  return db
    .select()
    .from(ticketEvents)
    .where(and(eq(ticketEvents.ticketId, ticketId), eq(ticketEvents.kind, "COMMENTED")));
}

describe("ticket comments", () => {
  it("lets the creator post a file that the holder can open", async () => {
    const ticketId = await newTicket();
    const key = await uploadPng(creator, ticketId);
    await addTicketComment(creator, ticketId, {
      body: "  Photo attached.  ",
      files: [{ key, fileName: "photo.png" }],
    });

    const [comment] = await commentsOn(ticketId);
    expect(comment?.reason).toBe("Photo attached.");
    const [attachment] = await db
      .select()
      .from(ticketAttachments)
      .where(eq(ticketAttachments.ticketId, ticketId));
    expect(attachment).toMatchObject({
      eventId: comment?.id,
      contentType: "image/png",
      byteSize: 4,
      uploadedById: creator,
    });

    const url = await ticketAttachmentUrl(holder, attachment?.id ?? "");
    const download = await fetch(url);
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(pngBytes);
  });

  it("allows a comment that is only text, and refuses an empty one", async () => {
    const ticketId = await newTicket();
    await addTicketComment(holder, ticketId, { body: "On it.", files: [] });
    await expect(addTicketComment(holder, ticketId, { body: "   ", files: [] })).rejects.toThrow(
      "Write a comment or attach a file.",
    );
    expect(await commentsOn(ticketId)).toHaveLength(1);
  });

  it("gives someone who can't see the ticket no upload link, no comment and no file link", async () => {
    const ticketId = await newTicket();
    await expect(startTicketAttachmentUploads(outsider, ticketId, [png])).rejects.toThrow(
      "Ticket not found",
    );
    await expect(addTicketComment(outsider, ticketId, { body: "Hi", files: [] })).rejects.toThrow(
      "Ticket not found",
    );

    const key = await uploadPng(creator, ticketId);
    await addTicketComment(creator, ticketId, { body: "", files: [{ key, fileName: "a.png" }] });
    const [attachment] = await db
      .select({ id: ticketAttachments.id })
      .from(ticketAttachments)
      .where(eq(ticketAttachments.ticketId, ticketId));
    await expect(ticketAttachmentUrl(outsider, attachment?.id ?? "")).rejects.toThrow(
      "File not found",
    );
  });

  it("refuses a file of the wrong type, over 10 MB, or past the fifth", async () => {
    const ticketId = await newTicket();
    await expect(
      startTicketAttachmentUploads(creator, ticketId, [
        { fileName: "notes.docx", contentType: "application/msword", byteSize: 10 },
      ]),
    ).rejects.toThrow("Only PNG, JPEG, WebP or PDF");
    await expect(
      startTicketAttachmentUploads(creator, ticketId, [
        { ...png, byteSize: MAX_TICKET_ATTACHMENT_BYTES + 1 },
      ]),
    ).rejects.toThrow("10 MB");
    await expect(
      startTicketAttachmentUploads(
        creator,
        ticketId,
        Array.from({ length: 6 }, () => png),
      ),
    ).rejects.toThrow("up to 5 files");
    await expect(
      addTicketComment(creator, ticketId, {
        body: "",
        files: Array.from({ length: 6 }, (_, i) => ({
          key: `tickets/${ticketId}/${creator}/x${i}`,
          fileName: "a.png",
        })),
      }),
    ).rejects.toThrow("up to 5 files");
  });

  it("checks what S3 holds, not what the browser said it would send", async () => {
    const ticketId = await newTicket();
    const key = `tickets/${ticketId}/${creator}/sneaky`;
    await getS3Client("ticket-attachments").send(
      new PutObjectCommand({
        Bucket: getBucket("ticket-attachments").bucket,
        Key: key,
        Body: "<script></script>",
        ContentType: "text/html",
      }),
    );
    try {
      await expect(
        addTicketComment(creator, ticketId, { body: "", files: [{ key, fileName: "a.png" }] }),
      ).rejects.toThrow("Only PNG, JPEG, WebP or PDF");
    } finally {
      await deleteObject({ Key: key }, "ticket-attachments");
    }
    await expect(
      addTicketComment(creator, ticketId, {
        body: "",
        files: [{ key: `tickets/${ticketId}/${creator}/missing`, fileName: "gone.png" }],
      }),
    ).rejects.toThrow("didn't finish uploading");
    expect(await commentsOn(ticketId)).toHaveLength(0);
  });

  it("refuses to link a file someone else uploaded", async () => {
    const ticketId = await newTicket();
    const key = await uploadPng(holder, ticketId);
    await expect(
      addTicketComment(creator, ticketId, { body: "", files: [{ key, fileName: "theirs.png" }] }),
    ).rejects.toThrow("wasn't uploaded for this ticket");
    await deleteObject({ Key: key }, "ticket-attachments");
  });

  it("lets only the author hide a comment, once, and then its files can't be opened", async () => {
    const ticketId = await newTicket();
    const key = await uploadPng(creator, ticketId);
    await addTicketComment(creator, ticketId, {
      body: "Wrong ticket.",
      files: [{ key, fileName: "a.png" }],
    });
    const [comment] = await commentsOn(ticketId);
    const [attachment] = await db
      .select({ id: ticketAttachments.id })
      .from(ticketAttachments)
      .where(eq(ticketAttachments.ticketId, ticketId));

    await expect(hideTicketComment(holder, comment?.id ?? "")).rejects.toThrow(
      "Only the comment's author can hide it",
    );
    await hideTicketComment(creator, comment?.id ?? "");
    await expect(hideTicketComment(creator, comment?.id ?? "")).rejects.toThrow("already hidden");

    const [hidden] = await commentsOn(ticketId);
    expect(hidden?.archivedById).toBe(creator);
    await expect(ticketAttachmentUrl(creator, attachment?.id ?? "")).rejects.toThrow(
      "File not found",
    );
  });

  it("takes no comments and no hides once the ticket is closed", async () => {
    const ticketId = await newTicket();
    await addTicketComment(creator, ticketId, { body: "Before it closed.", files: [] });
    const [comment] = await commentsOn(ticketId);
    await db.update(tickets).set({ status: "CLOSED" }).where(eq(tickets.id, ticketId));

    await expect(
      addTicketComment(creator, ticketId, { body: "Too late.", files: [] }),
    ).rejects.toThrow("This ticket is closed");
    await expect(startTicketAttachmentUploads(creator, ticketId, [png])).rejects.toThrow(
      "This ticket is closed",
    );
    await expect(hideTicketComment(creator, comment?.id ?? "")).rejects.toThrow(
      "This ticket is closed",
    );
  });
});
