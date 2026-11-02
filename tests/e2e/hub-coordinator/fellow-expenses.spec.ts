import { eq, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  fellow,
  fellowAttendance,
  interventionSession,
  payoutStatements,
  sessionName,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { cellUnder, expandRow, getUrl, searchRows } from "#/tests/pages/helpers";

type Coordinator = {
  email: string;
  userId: string;
  hubId: string;
  implementerId: string;
  schoolId: string;
};

// One attendance per kind of session the report counts, and what each one paid. s5 is an
// intervention session past the four the report calls "main".
const ATTENDANCES = [
  { code: "s0", amount: 500, confirmed: true },
  { code: "s1", amount: 1500, confirmed: false },
  { code: "s2", amount: 1500, confirmed: false, unmarked: true },
  { code: "s5", amount: 1500, confirmed: false },
  { code: "t1", amount: 300, confirmed: true },
  { code: "sv1", amount: 400, confirmed: false },
  { code: "special", amount: 200, confirmed: false },
];

test("a fellow's row counts their sessions by kind and totals their payouts", async ({
  page,
  context,
  undo,
}) => {
  const {
    rows: [coordinator],
  } = await db.execute<Coordinator>(sql`
    select u.email, u.id as "userId", hc.assigned_hub_id as "hubId",
      h.implementer_id as "implementerId", s.id as "schoolId"
    from implementer_members m
    join users u on u.id = m.user_id
    join hub_coordinators hc on hc.id = m.identifier
    join hubs h on h.id = hc.assigned_hub_id
    join schools s on s.hub_id = h.id and s.archived_at is null
    where m.role = 'HUB_COORDINATOR' and ${signableMember()}
    order by u.email, s.id
    limit 1`);
  required(coordinator, "a hub coordinator whose hub has a school");

  const label = `E2E Expenses ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [special] = await db
    .insert(sessionName)
    .values({
      hubId: coordinator.hubId,
      sessionType: "SPECIAL",
      sessionName: `special-${label}`,
      sessionLabel: "E2E special",
      amount: 200,
    })
    .returning({ id: sessionName.id });
  required(special, "the special session type");
  const fellowId = objectId("fellow");
  const sessionIds: string[] = [];
  undo(async () => {
    const attendances = db
      .select({ id: fellowAttendance.id })
      .from(fellowAttendance)
      .where(eq(fellowAttendance.fellowId, fellowId));
    await db
      .delete(payoutStatements)
      .where(inArray(payoutStatements.fellowAttendanceId, attendances));
    await db.delete(fellowAttendance).where(eq(fellowAttendance.fellowId, fellowId));
    if (sessionIds.length > 0) {
      await db.delete(interventionSession).where(inArray(interventionSession.id, sessionIds));
    }
    await db.delete(fellow).where(eq(fellow.id, fellowId));
    await db.delete(sessionName).where(eq(sessionName.id, special.id));
  });
  await db.insert(fellow).values({
    id: fellowId,
    fellowName: label,
    hubId: coordinator.hubId,
    implementerId: coordinator.implementerId,
    mpesaNumber: "254700000000",
  });

  const hubSessionNames = await db.query.sessionName.findMany({
    where: (n, { eq }) => eq(n.hubId, coordinator.hubId),
    columns: { id: true, sessionName: true },
  });
  const sessionNameId = (code: string) =>
    code === "special" ? special.id : hubSessionNames.find((n) => n.sessionName === code)?.id;

  for (const [index, attendance] of ATTENDANCES.entries()) {
    const typeId = sessionNameId(attendance.code);
    required(typeId, `session type ${attendance.code} in the coordinator's hub`);
    const sessionId = objectId("session");
    const sessionDate = new Date(Date.now() - (ATTENDANCES.length - index) * 24 * 3600 * 1000);
    await db.insert(interventionSession).values({
      id: sessionId,
      hubId: coordinator.hubId,
      schoolId: coordinator.schoolId,
      sessionId: typeId,
      occurred: true,
      yearOfImplementation: sessionDate.getFullYear(),
      sessionDate,
    });
    sessionIds.push(sessionId);
    const [marked] = await db
      .insert(fellowAttendance)
      .values({ fellowId, sessionId, sessionDate, attended: true })
      .returning({ id: fellowAttendance.id });
    required(marked, "the fellow's attendance");
    await db.insert(payoutStatements).values({
      fellowAttendanceId: marked.id,
      amount: attendance.amount,
      reason: "MARK_SESSION_ATTENDANCE",
      createdBy: coordinator.userId,
      confirmedAt: attendance.confirmed ? new Date() : null,
    });
    if (attendance.unmarked) {
      await db.insert(payoutStatements).values({
        fellowAttendanceId: marked.id,
        amount: -attendance.amount,
        reason: "UNMARK_SESSION_ATTENDANCE",
        createdBy: coordinator.userId,
      });
    }
  }

  await signInWithEmail(context, coordinator.email);
  await page.goto(getUrl("/hc/reporting/expenses/fellows"));

  const row = await searchRows(page, label);
  await expect(row).toHaveCount(1);
  const cell = (header: string) => cellUnder(page, row, header);
  await expect(await cell("Special Session")).toHaveText("1");
  // s2 has two statements; it is still one session.
  await expect(await cell("Pre vs Main sessions")).toHaveText("1 - pre | 2 - main");
  await expect(await cell("Training vs Supervision")).toHaveText("1 - T | 1 - SV");
  // The confirmed s0 and t1 statements.
  await expect(await cell("Paid Amount (KES)")).toHaveText("800");
  // 500 + 1500 + 1500 - 1500 + 1500 + 300 + 400 + 200
  await expect(await cell("Total Amount (KES)")).toHaveText("4400");

  const payoutTable = await expandRow(page, row);
  await expect(payoutTable.locator("tbody tr")).toHaveCount(8);
  await expect(payoutTable.locator('[aria-haspopup="menu"]')).toHaveCount(0);
});
