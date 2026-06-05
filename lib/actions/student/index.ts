"use server";

import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import {
  ArchiveStudentSchema,
  DropoutStudentSchema,
  MarkAttendanceSchema,
  StudentReportingNotesSchema,
} from "#/app/(platform)/hc/schemas";
import { currentHubCoordinator, getCurrentPersonnel } from "#/app/auth";
import {
  MoveStudentToSchoolSchema,
  StudentDetailsSchema,
} from "#/components/common/student/schemas";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { generateStudentVisibleID } from "#/lib/utils";

async function checkAuth() {
  const user = await getCurrentPersonnel();
  if (user === null) {
    throw new Error("The session has not been authenticated");
  }
  return user;
}

export async function submitStudentDetails(data: z.infer<typeof StudentDetailsSchema>) {
  // TODO: Add db transactions
  try {
    const auth = await checkAuth();
    const userId = auth.session.user.id;
    if (!userId) {
      throw new Error("The session has not been authenticated");
    }

    const {
      id,
      studentName,
      form,
      stream,
      gender,
      yearOfBirth,
      admissionNumber,
      phoneNumber,
      questionnaireType,
      mode,
      assignedGroupId,
      schoolId,
    } = StudentDetailsSchema.parse(data);

    if (mode === "edit") {
      await db.student.update({
        where: {
          id,
        },
        data: {
          studentName,
          gender,
          yearOfBirth: Number(yearOfBirth),
          form: Number(form),
          stream,
          phoneNumber,
          admissionNumber,
          questionnaireType:
            questionnaireType === "none" || questionnaireType == null ? null : questionnaireType,
        },
      });
      return {
        success: true,
        message: `Successfully updated details for ${studentName}`,
      };
    }
    const group = await db.interventionGroup.findFirstOrThrow({
      where: {
        id: assignedGroupId,
      },
      include: {
        leader: {
          include: {
            supervisor: true,
          },
        },
      },
    });
    const school = await db.school.findFirstOrThrow({
      where: {
        id: schoolId,
      },
    });

    const studentCount = await db.student.count();
    const student = await db.student.create({
      data: {
        id: objectId("stu"),
        visibleId: generateStudentVisibleID(group?.groupName ?? "NA", studentCount),
        studentName,
        schoolId: school.id,
        admissionNumber,
        yearOfBirth: Number(yearOfBirth),
        gender,
        form: Number(form),
        stream,
        questionnaireType:
          questionnaireType === "none" || questionnaireType == null ? null : questionnaireType,
        assignedGroupId,
        implementerId: auth.session.user.activeMembership?.implementerId,
        fellowId: group.leader.id,
        supervisorId: group.leader.supervisor?.id,
      },
    });

    return {
      success: true,
      message: `Successfully added ${student.studentName} to group ${group.groupName}`,
      data: student,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Sorry, could not update student information.",
    };
  }
}

export async function markStudentAttendance(data: z.infer<typeof MarkAttendanceSchema>) {
  try {
    const auth = await checkAuth();
    const userId = auth.session.user.id;
    if (!userId) {
      throw new Error("The session has not been authenticated");
    }

    const { id, sessionId, absenceReason, attended, comments } = MarkAttendanceSchema.parse(data);

    const session = await db.interventionSession.findUniqueOrThrow({
      where: {
        id: sessionId,
      },
    });

    if (!session.occurred) {
      return {
        success: false,
        message: "This session has not occurred yet.",
      };
    }

    const student = await db.student.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        assignedGroup: true,
      },
    });

    if (student) {
      if (!student.assignedGroup) {
        return {
          success: false,
          message: `${student.studentName} has not been assigned to a group.`,
        };
      }

      await db.studentAttendance.upsert({
        where: {
          studentId_sessionId: {
            studentId: student.id,
            sessionId,
          },
        },
        create: {
          studentId: student.id,
          schoolId: student.schoolId,
          projectId: student.assignedGroup.projectId,
          absenceReason,
          comments,
          sessionId,
          groupId: student.assignedGroup.id,
          fellowId: student.assignedGroup.leaderId,
          markedBy: userId,
          attended: attended === "attended" ? true : attended === "missed" ? false : null,
        },
        update: {
          markedBy: userId,
          studentId: student.id,
          absenceReason,
          comments,
          attended: attended === "attended" ? true : attended === "missed" ? false : null,
        },
      });
      return {
        success: true,
        message: `Successfully marked attendance for ${student.studentName}`,
      };
    }
    return {
      success: false,
      message: "Student details not found.",
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ?? "Sorry, an error occurred while marking student attendance.",
    };
  }
}

export async function markManyStudentsAttendance(
  ids: string[],
  data: z.infer<typeof MarkAttendanceSchema>,
) {
  try {
    const auth = await checkAuth();
    const userId = auth.session.user.id;
    if (!userId) {
      throw new Error("The session has not been authenticated");
    }

    const { sessionId, absenceReason, attended, comments } = MarkAttendanceSchema.parse(data);

    const session = await db.interventionSession.findUniqueOrThrow({
      where: {
        id: sessionId,
      },
    });

    if (!session.occurred) {
      return {
        success: false,
        message: "This session has not occurred yet.",
      };
    }

    const status = attended === "attended" ? true : attended === "missed" ? false : null;

    await db.$transaction(async (tx) => {
      // Create new attendance records
      const attendances = await tx.studentAttendance.findMany({
        where: {
          studentId: {
            in: ids,
          },
          sessionId,
        },
        include: {
          student: true,
        },
      });

      const studentIds = ids.filter((id) => {
        return !attendances.map((x) => x.studentId).includes(id);
      });

      const students = await tx.student.findMany({
        where: {
          archivedAt: null,
          id: {
            in: studentIds,
          },
        },
        include: {
          assignedGroup: true,
        },
      });

      const createRecords: Prisma.StudentAttendanceCreateManyInput[] = [];

      students.forEach((student) => {
        if (!student.assignedGroup) {
          throw new Error(`${student.studentName} has not been assigned to a group.`);
        }

        createRecords.push({
          studentId: student.id,
          schoolId: student.schoolId,
          projectId: student.assignedGroup.projectId,
          absenceReason,
          comments,
          sessionId,
          groupId: student.assignedGroup.id,
          fellowId: student.assignedGroup.leaderId,
          markedBy: userId,
          attended: status,
        });
      });

      await tx.studentAttendance.createMany({
        data: createRecords,
      });

      // Update existing attendances
      await tx.studentAttendance.updateMany({
        where: {
          studentId: {
            in: ids,
          },
          sessionId,
        },
        data: {
          markedBy: userId,
          absenceReason: status === null || status ? null : absenceReason,
          comments: status === null || status ? null : comments,
          attended: status,
        },
      });
    });
    return {
      success: true,
      message: `Successfully marked attendance for ${ids.length} students`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ?? "Sorry, an error occurred while marking student attendance.",
    };
  }
}

export async function dropoutStudent(data: z.infer<typeof DropoutStudentSchema>) {
  try {
    await checkAuth();

    const { studentId, mode, dropoutReason } = DropoutStudentSchema.parse(data);
    const result = await db.student.update({
      data: {
        droppedOut: mode === "dropout",
        dropOutReason: mode === "dropout" ? dropoutReason : null,
        droppedOutAt: mode === "dropout" ? new Date() : null,
      },
      where: {
        id: studentId,
      },
    });

    return {
      success: true,
      message:
        mode === "dropout"
          ? `${result.studentName} successfully dropped out.`
          : `${result.studentName} successfully un-dropped.`,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: `Something went wrong while trying to ${data.mode === "dropout" ? "drop out student" : "undo drop out"}`,
    };
  }
}

export async function archiveStudent(data: z.infer<typeof ArchiveStudentSchema>) {
  try {
    await checkAuth();

    const { studentId } = ArchiveStudentSchema.parse(data);
    const result = await db.student.update({
      data: {
        archivedAt: new Date(),
      },
      where: {
        id: studentId,
      },
    });

    return {
      success: true,
      message: `${result.studentName} has been archived.`,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: "Something went wrong while trying to archive student.",
    };
  }
}

export async function submitStudentReportingNotes(
  data: z.infer<typeof StudentReportingNotesSchema>,
) {
  try {
    const auth = await checkAuth();
    const userId = auth.session.user.id;
    if (!userId) {
      throw new Error("The session has not been authenticated");
    }

    const { studentId, notes } = StudentReportingNotesSchema.parse(data);

    await db.studentReportingNotes.create({
      data: {
        studentId,
        notes,
        addedBy: userId,
      },
    });
    return {
      success: true,
      message: "Successfully submitted reporting notes",
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Sorry, could not submit reporting notes.",
    };
  }
}

export async function checkExistingStudents(admissionNumber: string, schoolId: string) {
  await checkAuth();
  return await db.student.findMany({
    where: {
      archivedAt: null,
      admissionNumber: admissionNumber,
      school: {
        id: schoolId,
      },
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
  } catch {
    return { error: "Something went wrong while adding student to the group." };
  }
}

export async function getHubSchoolsForStudentTransfer() {
  const hubCoordinator = await currentHubCoordinator();
  const hubId = hubCoordinator?.profile?.assignedHubId;
  if (!hubId) {
    return [];
  }

  return await db.school.findMany({
    where: {
      hubId,
      archivedAt: null,
    },
    select: {
      id: true,
      schoolName: true,
      visibleId: true,
    },
    orderBy: {
      schoolName: "asc",
    },
  });
}

export async function getSchoolGroupsForStudentTransfer(schoolId: string) {
  const hubCoordinator = await currentHubCoordinator();
  const hubId = hubCoordinator?.profile?.assignedHubId;
  if (!hubId) {
    return [];
  }

  return await db.interventionGroup.findMany({
    where: {
      schoolId,
      archivedAt: null,
      school: {
        hubId,
      },
    },
    select: {
      id: true,
      groupName: true,
      leader: {
        select: {
          id: true,
          fellowName: true,
        },
      },
    },
    orderBy: {
      groupName: "asc",
    },
  });
}

export async function moveStudentToSchool(data: z.infer<typeof MoveStudentToSchoolSchema>) {
  try {
    const hubCoordinator = await currentHubCoordinator();
    const hubId = hubCoordinator?.profile?.assignedHubId;
    if (!hubId) {
      throw new Error("You are not authorized to move students between schools.");
    }

    const { studentId, schoolId, assignedGroupId } = MoveStudentToSchoolSchema.parse(data);

    const student = await db.student.findUniqueOrThrow({
      where: { id: studentId },
      select: {
        id: true,
        studentName: true,
        schoolId: true,
        assignedGroupId: true,
      },
    });

    if (student.schoolId === schoolId) {
      return {
        success: false,
        message: "This student already belongs to the selected school.",
      };
    }

    const group = await db.interventionGroup.findFirstOrThrow({
      where: {
        id: assignedGroupId,
        schoolId,
        school: {
          hubId,
        },
      },
      include: {
        school: {
          select: {
            id: true,
            schoolName: true,
          },
        },
        leader: {
          select: {
            id: true,
            fellowName: true,
            supervisor: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    await db.$transaction(async (tx) => {
      await tx.studentAttendance.deleteMany({
        where: { studentId: student.id },
      });

      await tx.student.update({
        where: { id: student.id },
        data: {
          schoolId: group.school.id,
          assignedGroupId: group.id,
          fellowId: group.leader.id,
          supervisorId: group.leader.supervisor?.id ?? null,
        },
      });

      await tx.studentGroupTransferTrail.create({
        data: {
          studentId: student.id,
          currentGroupId: group.id,
          fromGroupId: student.assignedGroupId,
        },
      });
    });

    return {
      success: true,
      message: `Successfully moved ${student.studentName} to ${group.school.schoolName} (${group.leader.fellowName} · ${group.groupName})`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ?? "Sorry, could not move the student to the selected school.",
    };
  }
}
