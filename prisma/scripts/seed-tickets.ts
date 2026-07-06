import type { TicketCategory, TicketPriorityLevel, TicketStatus } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TEST_CREDENTIALS } from "#/lib/auth/credential-auth";
import { db } from "#/lib/db";

interface TicketCSVRow {
  Ticket_ID: string;
  Fellow_Email: string;
  Supervisor_Email: string;
  Category: TicketCategory;
  Priority: TicketPriorityLevel;
  Status: TicketStatus;
  Subject: string;
  Description: string;
}

interface UserIds {
  fellowUserId: string;
  supervisorUserId: string;
}

async function validateFellowAndSupervisor(
  fellowEmail: string,
  supervisorEmail: string,
): Promise<UserIds | null> {
  if (!TEST_CREDENTIALS[fellowEmail] || !TEST_CREDENTIALS[supervisorEmail]) {
    return null;
  }

  const fellowUser = await db.user.findFirst({
    where: { email: fellowEmail },
    select: { id: true },
  });

  if (!fellowUser) {
    return null;
  }

  const supervisorUser = await db.user.findFirst({
    where: { email: supervisorEmail },
    select: { id: true },
  });

  if (!supervisorUser) {
    return null;
  }

  return {
    fellowUserId: fellowUser.id,
    supervisorUserId: supervisorUser.id,
  };
}

export async function createTicketsFromCSV() {
  const csvPath = join(__dirname, "data", "tickets.csv");
  const csvContent = readFileSync(csvPath, "utf-8");

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as TicketCSVRow[];

  for (const record of records) {
    try {
      const userIds = await validateFellowAndSupervisor(
        record.Fellow_Email,
        record.Supervisor_Email,
      );

      if (!userIds) {
        continue;
      }

      if (!record.Subject || !record.Description || !record.Category || !record.Priority) {
        continue;
      }

      await db.$transaction(async (tx) => {
        const ticket = await tx.tickets.create({
          data: {
            createdById: userIds.fellowUserId,
            subject: record.Subject,
            description: record.Description,
            category: record.Category,
            priority: record.Priority,
            status: record.Status || "ESCALATED",
          },
        });

        await tx.ticketEscalations.create({
          data: {
            ticketId: ticket.id,
            escalatedById: userIds.fellowUserId,
            escalatedToId: userIds.supervisorUserId,
            escalationReason: record.Description,
          },
        });
      });
    } catch (error) {
      console.error(`Error processing ticket ${record.Ticket_ID}:`, error);
    }
  }

  console.log("Ticket seeding process completed");
}
