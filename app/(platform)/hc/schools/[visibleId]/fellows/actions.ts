"use server";

import { AddNewStudentSchema } from "#/app/(platform)/hc/schemas";
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
