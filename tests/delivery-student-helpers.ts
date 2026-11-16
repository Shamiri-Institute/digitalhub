import { eq, inArray, or, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  attendanceDocuments,
  fellow,
  hubCoordinator,
  implementerMember,
  interventionGroup,
  interventionSession,
  school,
  session,
  student,
  studentAttendance,
  studentGroupTransferTrail,
  supervisor,
  user,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { deleteObject } from "#/lib/s3/s3.service";
import type { Undo } from "#/tests/fixtures";
import { required } from "#/tests/helpers";

type Hub = {
  hubId: string;
  otherHubId: string;
  implementerId: string;
  projectId: string;
  olderSessionNameId: string;
  latestSessionNameId: string;
};

/** A default-project hub with the s1 and s2 session names, and another hub of its implementer. */
async function pickHub() {
  const {
    rows: [row],
  } = await db.execute<Hub>(sql`
    select h.id as "hubId", o.id as "otherHubId", h.implementer_id as "implementerId",
      h.project_id as "projectId", n1.id as "olderSessionNameId", n2.id as "latestSessionNameId"
    from hubs h
    join projects p on p.id = h.project_id and p.is_default
    join hubs o on o.implementer_id = h.implementer_id and o.id <> h.id
    join session_names n1 on n1.hub_id = h.id and n1.session_name = 's1'
    join session_names n2 on n2.hub_id = h.id and n2.session_name = 's2'
    order by h.id, o.id
    limit 1`);
  required(row, "a default-project hub with s1 and s2 and a second hub");
  return row;
}

/**
 * A new school in a seeded hub with users who can sign in: a hub coordinator, the school's point
 * supervisor and a fellow they supervise who leads a group there. Another fellow, who cannot sign
 * in, leads a second group. S1 was held eight days ago and S2 yesterday. A second school in the hub
 * receives moved students. `undo` removes all of it and what the UI wrote to it.
 */
export async function createStudentSchool(undo: Undo) {
  const hub = await pickHub();
  const label = `e2e stu ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const coordinatorId = objectId("hc");
  const supervisorId = objectId("sup");
  const fellowId = objectId("fellow");
  const otherFellowId = objectId("fellow");
  const schoolId = objectId("sch");
  const secondSchoolId = objectId("sch");
  const groupId = objectId("group");
  const otherGroupId = objectId("group");
  const olderSessionId = objectId("isess");
  const latestSessionId = objectId("isess");
  const userEmails: string[] = [];
  const schoolIds = [schoolId, secondSchoolId];

  undo(async () => {
    const studentsOfSchools = db
      .select({ id: student.id })
      .from(student)
      .where(inArray(student.schoolId, schoolIds));
    const groupsOfSchools = db
      .select({ id: interventionGroup.id })
      .from(interventionGroup)
      .where(inArray(interventionGroup.schoolId, schoolIds));
    const documents = await db
      .delete(attendanceDocuments)
      .where(inArray(attendanceDocuments.groupId, groupsOfSchools))
      .returning({ link: attendanceDocuments.link });
    await Promise.all(
      documents.map(({ link }) => deleteObject({ Key: link }, "student-attendance")),
    );
    await db
      .delete(studentAttendance)
      .where(
        or(
          inArray(studentAttendance.studentId, studentsOfSchools),
          inArray(studentAttendance.sessionId, [olderSessionId, latestSessionId]),
        ),
      );
    await db
      .delete(studentGroupTransferTrail)
      .where(inArray(studentGroupTransferTrail.studentId, studentsOfSchools));
    await db.delete(student).where(inArray(student.schoolId, schoolIds));
    await db
      .delete(interventionSession)
      .where(inArray(interventionSession.id, [olderSessionId, latestSessionId]));
    await db.delete(interventionGroup).where(inArray(interventionGroup.schoolId, schoolIds));
    const users = db.select({ id: user.id }).from(user).where(inArray(user.email, userEmails));
    await db.delete(session).where(inArray(session.userId, users));
    await db.delete(implementerMember).where(inArray(implementerMember.userId, users));
    await db.delete(user).where(inArray(user.email, userEmails));
    await db.delete(fellow).where(inArray(fellow.id, [fellowId, otherFellowId]));
    await db.delete(school).where(inArray(school.id, schoolIds));
    await db.delete(supervisor).where(eq(supervisor.id, supervisorId));
    await db.delete(hubCoordinator).where(eq(hubCoordinator.id, coordinatorId));
  });

  async function createUser(role: "HUB_COORDINATOR" | "SUPERVISOR" | "FELLOW", identifier: string) {
    const email = `e2e-${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    userEmails.push(email);
    const [created] = await db
      .insert(user)
      .values({ email, name: `${label} ${role}` })
      .returning({ id: user.id });
    required(created, `the ${role} user`);
    await db
      .insert(implementerMember)
      .values({ implementerId: hub.implementerId, userId: created.id, role, identifier });
    return email;
  }

  await db.insert(hubCoordinator).values({
    id: coordinatorId,
    visibleId: coordinatorId,
    coordinatorName: `${label} coordinator`,
    implementerId: hub.implementerId,
    assignedHubId: hub.hubId,
  });
  await db.insert(supervisor).values({
    id: supervisorId,
    supervisorName: `${label} supervisor`,
    hubId: hub.hubId,
    implementerId: hub.implementerId,
  });
  const fellowName = `${label} fellow`;
  const otherFellowName = `${label} other fellow`;
  await db.insert(fellow).values([
    {
      id: fellowId,
      fellowName,
      hubId: hub.hubId,
      implementerId: hub.implementerId,
      supervisorId,
    },
    {
      id: otherFellowId,
      fellowName: otherFellowName,
      hubId: hub.hubId,
      implementerId: hub.implementerId,
      supervisorId,
    },
  ]);
  const coordinatorEmail = await createUser("HUB_COORDINATOR", coordinatorId);
  const supervisorEmail = await createUser("SUPERVISOR", supervisorId);
  const fellowEmail = await createUser("FELLOW", fellowId);

  const schoolName = `${label} school`;
  const secondSchoolName = `${label} second school`;
  const visibleId = objectId("sch");
  const secondVisibleId = objectId("sch");
  await db.insert(school).values([
    { id: schoolId, visibleId, schoolName, hubId: hub.hubId, assignedSupervisorId: supervisorId },
    {
      id: secondSchoolId,
      visibleId: secondVisibleId,
      schoolName: secondSchoolName,
      hubId: hub.hubId,
      assignedSupervisorId: supervisorId,
    },
  ]);
  const groupName = `${label} group`;
  const otherGroupName = `${label} other group`;
  await db.insert(interventionGroup).values([
    {
      id: groupId,
      groupName,
      schoolId,
      leaderId: fellowId,
      projectId: hub.projectId,
    },
    {
      id: otherGroupId,
      groupName: otherGroupName,
      schoolId,
      leaderId: otherFellowId,
      projectId: hub.projectId,
    },
  ]);
  const daysAgo = (days: number) => {
    const date = new Date(Date.now() - days * 24 * 3600 * 1000);
    date.setUTCHours(6, 0, 0, 0);
    return date;
  };
  const olderSessionDate = daysAgo(8);
  const latestSessionDate = daysAgo(1);
  await db.insert(interventionSession).values([
    {
      id: olderSessionId,
      hubId: hub.hubId,
      projectId: hub.projectId,
      schoolId,
      sessionId: hub.olderSessionNameId,
      sessionType: "s1",
      occurred: true,
      yearOfImplementation: olderSessionDate.getFullYear(),
      sessionDate: olderSessionDate,
    },
    {
      id: latestSessionId,
      hubId: hub.hubId,
      projectId: hub.projectId,
      schoolId,
      sessionId: hub.latestSessionNameId,
      sessionType: "s2",
      occurred: true,
      yearOfImplementation: latestSessionDate.getFullYear(),
      sessionDate: latestSessionDate,
    },
  ]);

  let studentCount = 0;
  async function addStudent(assignedGroupId = groupId) {
    studentCount += 1;
    const studentId = objectId("stu");
    // The tables print names in lower case.
    const studentName = `${label} student ${studentCount}`;
    await db.insert(student).values({
      id: studentId,
      visibleId: studentId,
      studentName,
      schoolId,
      assignedGroupId,
      admissionNumber: String(9500 + studentCount),
      gender: "Female",
      yearOfBirth: new Date().getFullYear() - 14,
      form: 2,
      stream: "B",
    });
    return { studentId, studentName };
  }

  return {
    ...hub,
    coordinatorId,
    coordinatorEmail,
    supervisorEmail,
    fellowId,
    fellowName,
    fellowEmail,
    otherFellowName,
    schoolId,
    schoolName,
    visibleId,
    secondSchoolId,
    secondSchoolName,
    secondVisibleId,
    groupId,
    groupName,
    otherGroupId,
    otherGroupName,
    olderSessionId,
    olderSessionDate,
    latestSessionId,
    latestSessionDate,
    addStudent,
  };
}
