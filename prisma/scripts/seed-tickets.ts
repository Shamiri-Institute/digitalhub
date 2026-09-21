import type { TicketCategory, TicketPriorityLevel } from "#/db/enums";
import { db } from "#/lib/db";

interface SeedTicket {
  category: TicketCategory;
  priority: TicketPriorityLevel;
  subject: string;
  description: string;
}

interface SeedTicketGroup {
  fellowEmail: string;
  supervisorEmail: string;
  tickets: SeedTicket[];
}

// Emails must exist in TEST_USER_EMAILS (lib/auth/credential-auth.ts) and be seeded before tickets.
const TICKET_GROUPS: SeedTicketGroup[] = [
  {
    fellowEmail: "bukayo.saka@test.com",
    supervisorEmail: "martin.odegaard@test.com",
    tickets: [
      {
        category: "TECH",
        priority: "HIGH",
        subject: "WiFi connection unstable",
        description: "The device is unable to maintain a stable WiFi connection during sessions",
      },
      {
        category: "TECH",
        priority: "MEDIUM",
        subject: "App crashes on startup",
        description: "The application keeps crashing when I attempt to start it",
      },
      {
        category: "RESEARCH",
        priority: "HIGH",
        subject: "IRB renewal deadline",
        description: "My IRB approval is expiring soon and needs to be renewed",
      },
      {
        category: "RESEARCH",
        priority: "MEDIUM",
        subject: "Consent form issues",
        description: "There are issues with the participant consent forms",
      },
      {
        category: "OPERATIONS",
        priority: "HIGH",
        subject: "Venue booking pending",
        description: "The venue booking for next week's training is still pending confirmation",
      },
      {
        category: "CARE",
        priority: "MEDIUM",
        subject: "Student distress signal",
        description: "A student showed clear signs of distress during yesterday's session",
      },
      {
        category: "CLINICAL",
        priority: "HIGH",
        subject: "Screening tool error",
        description: "The mental health screening tool is returning errors during assessments",
      },
      {
        category: "CLINICAL",
        priority: "MEDIUM",
        subject: "Assessment scoring query",
        description: "Need clarification on the new assessment scoring guidelines",
      },
    ],
  },
  {
    fellowEmail: "gabriel.martinelli@test.com",
    supervisorEmail: "declan.rice@test.com",
    tickets: [
      {
        category: "TECH",
        priority: "HIGH",
        subject: "Device battery draining",
        description: "Battery drains quickly even when the device is idle",
      },
      {
        category: "TECH",
        priority: "MEDIUM",
        subject: "Screen display flickering",
        description: "The screen flickers intermittently causing visibility issues",
      },
      {
        category: "RESEARCH",
        priority: "HIGH",
        subject: "Data collection delay",
        description: "Data collection is delayed due to scheduling conflicts",
      },
      {
        category: "RESEARCH",
        priority: "MEDIUM",
        subject: "Survey responses missing",
        description: "Several survey responses were not recorded in the system",
      },
      {
        category: "OPERATIONS",
        priority: "HIGH",
        subject: "Transport logistics",
        description: "Transport arrangements for the field visit need to be coordinated",
      },
      {
        category: "CARE",
        priority: "MEDIUM",
        subject: "Resource referral request",
        description: "Need to refer a student to appropriate mental health resources",
      },
      {
        category: "CLINICAL",
        priority: "HIGH",
        subject: "Clinical protocol unclear",
        description: "The clinical protocol for the intervention is unclear to me",
      },
      {
        category: "CLINICAL",
        priority: "MEDIUM",
        subject: "Case notes issue",
        description: "There is an issue with accessing or updating case notes",
      },
    ],
  },
  {
    fellowEmail: "gabriel.jesus@test.com",
    supervisorEmail: "william.saliba@test.com",
    tickets: [
      {
        category: "TECH",
        priority: "HIGH",
        subject: "Audio not working",
        description: "Audio output is not working during important presentations",
      },
      {
        category: "TECH",
        priority: "MEDIUM",
        subject: "Login timeout issues",
        description: "Login attempts timeout before completing authentication",
      },
      {
        category: "RESEARCH",
        priority: "HIGH",
        subject: "Ethics training expired",
        description: "My ethics training certification has expired and needs renewal",
      },
      {
        category: "RESEARCH",
        priority: "MEDIUM",
        subject: "Participant dropout form",
        description: "Need to document a participant who has dropped out of the study",
      },
      {
        category: "OPERATIONS",
        priority: "HIGH",
        subject: "Budget approval needed",
        description: "Budget approval for the new equipment is taking too long",
      },
      {
        category: "CARE",
        priority: "MEDIUM",
        subject: "Follow-up call needed",
        description: "Requesting a follow-up call with a student's family",
      },
      {
        category: "CLINICAL",
        priority: "HIGH",
        subject: "Diagnostic delay",
        description: "Diagnostic assessments are being delayed due to system issues",
      },
      {
        category: "CLINICAL",
        priority: "MEDIUM",
        subject: "Supervision session request",
        description: "Requesting a clinical supervision session to discuss cases",
      },
    ],
  },
];

export async function createTickets() {
  for (const group of TICKET_GROUPS) {
    const fellow = await db.user.findFirst({
      where: { email: group.fellowEmail },
      select: { id: true },
    });
    const supervisor = await db.user.findFirst({
      where: { email: group.supervisorEmail },
      select: { id: true },
    });

    if (!fellow || !supervisor) {
      console.warn(
        `Skipping tickets for ${group.fellowEmail} -> ${group.supervisorEmail}: user not seeded`,
      );
      continue;
    }

    for (const ticket of group.tickets) {
      await db.$transaction(async (tx) => {
        const created = await tx.tickets.create({
          data: {
            createdById: fellow.id,
            subject: ticket.subject,
            description: ticket.description,
            category: ticket.category,
            priority: ticket.priority,
            status: "ESCALATED",
          },
        });

        await tx.ticketEscalations.create({
          data: {
            ticketId: created.id,
            escalatedById: fellow.id,
            escalatedToId: supervisor.id,
            escalationReason: ticket.description,
          },
        });
      });
    }
  }

  console.log("Ticket seeding process completed");
}
