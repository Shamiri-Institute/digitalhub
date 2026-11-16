import { eq, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  fellow,
  fellowAttendance,
  implementerMember,
  interventionGroup,
  interventionSession,
  payoutStatements,
  school,
  session,
  student,
  supervisor,
  supervisorAttendance,
  user,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";
import type { Undo } from "#/tests/fixtures";
import { required, signableMember } from "#/tests/helpers";

type DeliveryHub = {
  hubId: string;
  implementerId: string;
  projectId: string;
  coordinatorEmail: string;
  sessionNameId: string;
  sessionName: string;
};

/** A hub in the default project with a hub coordinator who can sign in, and an intervention session name. */
async function pickDeliveryHub() {
  const {
    rows: [row],
  } = await db.execute<DeliveryHub>(sql`
    select h.id as "hubId", h.implementer_id as "implementerId", h.project_id as "projectId",
      u.email as "coordinatorEmail", n.id as "sessionNameId", n.session_name as "sessionName"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join hubs h on h.id = hc.assigned_hub_id
    join projects p on p.id = h.project_id and p.is_default
    join lateral (select n.id, n.session_name from session_names n
      where n.hub_id = h.id and n.session_type = 'INTERVENTION' and n.amount > 0
      order by n.session_name limit 1) n on true
    where ${signableMember()}
    order by u.email
    limit 1`);
  required(row, "a hub coordinator of a default-project hub with a paid intervention session name");
  return row;
}

/**
 * A new supervisor who can sign in, a school they are the point supervisor of, and a session held
 * there yesterday, all in a seeded hub. `addFellow` adds a fellow they supervise who leads a group
 * at the school. `undo` removes everything, the attendances and payout statements written to it too.
 */
export async function createSupervisedSession(undo: Undo) {
  const hub = await pickDeliveryHub();
  const label = `E2E delivery ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const supervisorId = objectId("sup");
  const supervisorName = `${label} supervisor`;
  const supervisorEmail = `e2e-sup-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const schoolId = objectId("sch");
  const schoolName = `${label} school`;
  const schoolVisibleId = objectId("sch");
  const sessionId = objectId("isess");
  const fellowIds: string[] = [];
  const groupIds: string[] = [];

  undo(async () => {
    const attendances = db
      .select({ id: fellowAttendance.id })
      .from(fellowAttendance)
      .where(eq(fellowAttendance.sessionId, sessionId));
    await db
      .delete(payoutStatements)
      .where(inArray(payoutStatements.fellowAttendanceId, attendances));
    await db.delete(fellowAttendance).where(eq(fellowAttendance.sessionId, sessionId));
    await db.delete(supervisorAttendance).where(eq(supervisorAttendance.sessionId, sessionId));
    await db.delete(interventionSession).where(eq(interventionSession.id, sessionId));
    if (groupIds.length > 0) {
      await db.delete(student).where(inArray(student.assignedGroupId, groupIds));
      await db.delete(interventionGroup).where(inArray(interventionGroup.id, groupIds));
    }
    if (fellowIds.length > 0) await db.delete(fellow).where(inArray(fellow.id, fellowIds));
    await db.delete(school).where(eq(school.id, schoolId));
    const supervisorUser = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.email, supervisorEmail),
      columns: { id: true },
    });
    if (supervisorUser) {
      await db.delete(session).where(eq(session.userId, supervisorUser.id));
      await db.delete(implementerMember).where(eq(implementerMember.userId, supervisorUser.id));
      await db.delete(user).where(eq(user.id, supervisorUser.id));
    }
    await db.delete(supervisor).where(eq(supervisor.id, supervisorId));
  });

  await db.insert(supervisor).values({
    id: supervisorId,
    supervisorName,
    hubId: hub.hubId,
    implementerId: hub.implementerId,
  });
  const [supervisorUser] = await db
    .insert(user)
    .values({ email: supervisorEmail, name: supervisorName })
    .returning({ id: user.id });
  required(supervisorUser, "the new supervisor's user");
  await db.insert(implementerMember).values({
    implementerId: hub.implementerId,
    userId: supervisorUser.id,
    role: "SUPERVISOR",
    identifier: supervisorId,
  });
  await db.insert(school).values({
    id: schoolId,
    visibleId: schoolVisibleId,
    schoolName,
    hubId: hub.hubId,
    assignedSupervisorId: supervisorId,
  });
  const sessionDate = new Date(Date.now() - 24 * 3600 * 1000);
  sessionDate.setUTCHours(6, 0, 0, 0);
  await db.insert(interventionSession).values({
    id: sessionId,
    hubId: hub.hubId,
    projectId: hub.projectId,
    schoolId,
    sessionId: hub.sessionNameId,
    sessionType: hub.sessionName,
    occurred: true,
    yearOfImplementation: sessionDate.getFullYear(),
    sessionDate,
  });

  async function addFellow({ students = 1 }: { students?: number } = {}) {
    const fellowId = objectId("fellow");
    const fellowName = `${label} fellow ${fellowIds.length + 1}`;
    fellowIds.push(fellowId);
    await db.insert(fellow).values({
      id: fellowId,
      fellowName,
      hubId: hub.hubId,
      implementerId: hub.implementerId,
      supervisorId,
      mpesaNumber: "254700000000",
    });
    const groupId = objectId("group");
    groupIds.push(groupId);
    await db.insert(interventionGroup).values({
      id: groupId,
      groupName: `${label} group ${groupIds.length}`,
      schoolId,
      leaderId: fellowId,
      projectId: hub.projectId,
    });
    for (let index = 0; index < students; index++) {
      const studentId = objectId("stu");
      await db.insert(student).values({
        id: studentId,
        visibleId: studentId,
        studentName: `${fellowName} student ${index + 1}`,
        schoolId,
        assignedGroupId: groupId,
        admissionNumber: String(9400 + index),
        gender: "Female",
        form: 2,
        stream: "B",
      });
    }
    return { fellowId, fellowName, groupId };
  }

  return {
    ...hub,
    supervisorId,
    supervisorName,
    supervisorEmail,
    schoolId,
    schoolName,
    schoolVisibleId,
    sessionId,
    sessionDate,
    addFellow,
  };
}

/** Another hub of the same implementer, to move a record out of the caller's hub. */
export async function otherHubOf(hubId: string) {
  const {
    rows: [row],
  } = await db.execute<{ id: string }>(sql`
    select o.id from hubs h join hubs o on o.implementer_id = h.implementer_id and o.id <> h.id
    where h.id = ${hubId} order by o.id limit 1`);
  required(row, `a second hub beside ${hubId}`);
  return row.id;
}

// The details forms save only a record whose fields pass their checks.
export const validPersonDetails = {
  idNumber: "12345678",
  cellNumber: "+254712345678",
  mpesaNumber: "+254712345678",
  mpesaName: "E2E Mpesa Name",
  county: "Nairobi",
  subCounty: "Westlands",
  gender: "Female",
  dateOfBirth: new Date("1999-01-01"),
};

/** A fellow of the supervisor who can sign in, with complete details, in `hubId`. */
export async function addFellowWithLogin(
  supervised: Awaited<ReturnType<typeof createSupervisedSession>>,
  undo: Undo,
  hubId = supervised.hubId,
) {
  const fellowId = objectId("fellow");
  const fellowName = `${supervised.supervisorName} fellow ${fellowId.slice(-6)}`;
  const fellowEmail = `e2e-fellow-${fellowId.slice(-10).toLowerCase()}@example.com`;
  await db.insert(fellow).values({
    id: fellowId,
    fellowName,
    fellowEmail,
    hubId,
    implementerId: supervised.implementerId,
    supervisorId: supervised.supervisorId,
    ...validPersonDetails,
  });
  const [fellowUser] = await db
    .insert(user)
    .values({ email: fellowEmail, name: fellowName })
    .returning({ id: user.id });
  required(fellowUser, "the fellow's user");
  await db.insert(implementerMember).values({
    implementerId: supervised.implementerId,
    userId: fellowUser.id,
    role: "FELLOW",
    identifier: fellowId,
  });
  undo(async () => {
    await db.delete(session).where(eq(session.userId, fellowUser.id));
    await db.delete(implementerMember).where(eq(implementerMember.userId, fellowUser.id));
    await db.delete(user).where(eq(user.id, fellowUser.id));
    await db.delete(interventionGroup).where(eq(interventionGroup.leaderId, fellowId));
    await db.delete(fellow).where(eq(fellow.id, fellowId));
  });
  return { fellowId, fellowName, fellowEmail, userId: fellowUser.id };
}
