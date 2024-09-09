"use server";

import { AddNewStudentSchema } from "#/app/(platform)/hc/schemas";
import { SchoolFellowTableData } from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/columns";
import { currentHubCoordinator } from "#/app/auth";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { generateStudentVisibleID } from "#/lib/utils";
import { z } from "zod";

async function checkAuth() {
  const hc = await currentHubCoordinator();

  if (!hc) {
    throw new Error("User not authorised to perform this function");
  }
}

export async function fetchFellowsWithRatings(visibleId: string) {
  const school = await db.school.findFirstOrThrow({
    where: {
      visibleId,
    },
  });

  return await db.$queryRaw<SchoolFellowTableData[]>`
      SELECT
        f.id, 
        f.fellow_name as "fellowName", 
        f.cell_number as "cellNumber", 
        f.supervisor_id as "supervisorId",
        sup.supervisor_name as "supervisorName", 
        f.dropped_out as "droppedOut", 
        ig.group_name as "groupName",
        ig.id as "groupId",
        (AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating))/4 AS "averageRating"
      FROM fellows f
      LEFT JOIN weekly_fellow_ratings wfr ON f.id = wfr.fellow_id
      LEFT JOIN supervisors sup ON f.supervisor_id = sup.id
      LEFT JOIN 
        (SELECT _ig.* FROM intervention_groups _ig WHERE _ig.school_id = ${school.id}) ig 
        ON f.id = ig.leader_id
      WHERE f.hub_id = ${school.hubId}
      GROUP BY f.id, ig.id, ig.group_name, sup.supervisor_name
  `;
}

export async function assignFellowSupervisor({
  fellowId,
  supervisorId,
}: {
  fellowId: string;
  supervisorId: string;
}) {
  try {
    await checkAuth();
    const result = await db.fellow.update({
      where: {
        id: fellowId,
      },
      data: {
        supervisorId,
      },
      include: {
        supervisor: true,
      },
    });
    return {
      success: true,
      message: `Successfully assigned ${result.fellowName} to ${result.supervisor ? result.supervisor.supervisorName : "supervisor"}.`,
    };
  } catch (error: unknown) {
    console.error(error);
    return { error: "Something went wrong assigning a supervisor" };
  }
}

export async function addNewStudentToGroup(
  data: z.infer<typeof AddNewStudentSchema>,
) {
  try {
    await checkAuth();
    const group = await db.interventionGroup.findFirst({
      where: {
        id: data.assignedGroupId,
      },
    });
    const studentCount = await db.student.count();
    const student = await db.student.create({
      data: {
        id: objectId("stu"),
        studentName: data.studentName,
        visibleId: generateStudentVisibleID(
          group?.groupName ?? "NA",
          studentCount,
        ),
        schoolId: data.schoolId,
        admissionNumber: data.admissionNumber,
        yearOfBirth: data.yearOfBirth,
        gender: data.gender,
        form: parseInt(data.form, 10),
        stream: data.stream,
        assignedGroupId: data.assignedGroupId,
      },
    });

    return {
      success: true,
      message: `Successfully added ${student.studentName} to group`,
      data: student,
    };
  } catch (error: unknown) {
    return { error: "Something went wrong while adding the new student" };
  }
}

export async function fetchSchoolFellowAttendances(visibleId: string) {
  return await db.fellowAttendance.findMany({
    where: {
      school: {
        visibleId,
      },
    },
    include: {
      session: true,
      group: true,
    },
  });
}
