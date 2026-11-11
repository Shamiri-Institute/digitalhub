import { describe, expect, it } from "vitest";

import { mayReopenTicket, ticketReopenDeadline } from "#/lib/ticket-reopen-window";

const resolvedAt = new Date("2026-03-20T09:30:00.000Z");
const deadline = new Date("2026-03-27T09:30:00.000Z");

describe("ticketReopenDeadline", () => {
  it("falls 7 days of 24 hours after the ticket was resolved", () => {
    expect(ticketReopenDeadline(resolvedAt)).toEqual(deadline);
  });
});

describe("mayReopenTicket", () => {
  it("allows reopening until the deadline and not from it on", () => {
    expect(mayReopenTicket(resolvedAt, resolvedAt)).toBe(true);
    expect(mayReopenTicket(resolvedAt, new Date(deadline.getTime() - 1))).toBe(true);
    expect(mayReopenTicket(resolvedAt, deadline)).toBe(false);
    expect(mayReopenTicket(resolvedAt, new Date("2026-05-01T00:00:00.000Z"))).toBe(false);
  });

  it("refuses a ticket with no resolution time", () => {
    expect(mayReopenTicket(null, resolvedAt)).toBe(false);
  });
});
