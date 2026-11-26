import { describe, expect, it } from "vitest";

import {
  MAX_TICKET_ATTACHMENT_BYTES,
  ticketAttachmentContentTypeOf,
  ticketAttachmentProblem,
} from "#/lib/ticket-attachment-files";

describe("ticketAttachmentContentTypeOf", () => {
  it("takes the browser's type when it is one that can be attached", () => {
    expect(ticketAttachmentContentTypeOf({ type: "image/PNG", name: "x.bin" })).toBe("image/png");
  });

  it("falls back to the extension only when the browser gives no type", () => {
    expect(ticketAttachmentContentTypeOf({ type: "", name: "Scan.JPEG" })).toBe("image/jpeg");
    expect(ticketAttachmentContentTypeOf({ type: "application/octet-stream", name: "a.pdf" })).toBe(
      "application/pdf",
    );
    expect(ticketAttachmentContentTypeOf({ type: "text/html", name: "a.pdf" })).toBeUndefined();
  });

  it("refuses HEIC and GIF", () => {
    expect(ticketAttachmentContentTypeOf({ type: "image/heic", name: "a.heic" })).toBeUndefined();
    expect(ticketAttachmentContentTypeOf({ type: "", name: "a.gif" })).toBeUndefined();
  });
});

describe("ticketAttachmentProblem", () => {
  it("allows an image or PDF up to 10 MB", () => {
    expect(
      ticketAttachmentProblem({ contentType: "image/webp", byteSize: MAX_TICKET_ATTACHMENT_BYTES }),
    ).toBeNull();
  });

  it("names what is wrong with a file", () => {
    expect(ticketAttachmentProblem({ contentType: "text/plain", byteSize: 10 })).toMatch(
      /PNG, JPEG, WebP or PDF/,
    );
    expect(
      ticketAttachmentProblem({
        contentType: "application/pdf",
        byteSize: MAX_TICKET_ATTACHMENT_BYTES + 1,
      }),
    ).toMatch(/10 MB/);
    expect(ticketAttachmentProblem({ contentType: "application/pdf", byteSize: 0 })).toMatch(
      /empty/,
    );
  });
});
