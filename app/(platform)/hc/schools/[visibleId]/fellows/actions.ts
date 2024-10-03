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
    const parsedData = AddNewStudentSchema.parse(data);
    const group = await db.interventionGroup.findFirst({
      where: {
        id: parsedData.assignedGroupId,
      },
    });
    const studentCount = await db.student.count();
    const student = await db.student.create({
      data: {
        id: objectId("stu"),
        studentName: parsedData.studentName,
        visibleId: generateStudentVisibleID(
          group?.groupName ?? "NA",
          studentCount,
        ),
        schoolId: parsedData.schoolId,
        admissionNumber: parsedData.admissionNumber,
        yearOfBirth: parsedData.yearOfBirth,
        gender: parsedData.gender,
        form: parseInt(parsedData.form, 10),
        stream: parsedData.stream,
        assignedGroupId: parsedData.assignedGroupId,
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

export async function checkExistingStudents(
  data: z.infer<typeof AddNewStudentSchema>,
) {
  await checkAuth();
  return await db.student.findMany({
    where: {
      admissionNumber: data.admissionNumber,
      schoolId: data.schoolId,
    },
    include: {
      assignedGroup: {
        include: {
          leader: true,
        },
      },
    },
  });
}

export async function transferStudentToGroup(id: string, groupId: string) {
  try {
    await checkAuth();
    const student = await db.student.update({
      where: {
        id,
      },
      data: {
        assignedGroupId: groupId,
      },
      include: {
        assignedGroup: true,
      },
    });

    return {
      success: true,
      message: `Successfully transferred ${student.studentName} to group ${student.assignedGroup?.groupName}`,
    };
  } catch (error: unknown) {
    return { error: "Something went wrong while adding student to the group." };
  }
}
