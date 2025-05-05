import { StudentTransferTrailCard } from "#/components/old/schools/[visibleId]/students/components/student-transfer-trail-card";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import { Prisma } from "@prisma/client";

type UniqueStudent = {
  [key: string]: boolean;
};
type GroupType = {
  groupId: string;
  groupName: string;
};

export default async function StudentTransferTrail({
  schoolId,
  group,
}: {
  schoolId: string;
  group?: GroupType;
}) {
  const studentGroupTransferTrailData =
    await db.studentGroupTransferTrail.findMany({
      where: {
        student: {
          school: {
            id: schoolId,
          },
        },
      },
      include: {
        student: {
          include: {
            fellow: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  const uniqueStudentsInstance: UniqueStudent = {};

  let uniqueList: Prisma.StudentGroupTransferTrailGetPayload<{
    include: {
      student: {
        include: {
          fellow: true;
        };
      };
    };
  }>[] = [];

  for (const instance of studentGroupTransferTrailData) {
    if (instance.student.assignedGroupId === group?.groupId) {
      continue;
    }

    if (!uniqueStudentsInstance[instance.studentId]) {
      uniqueStudentsInstance[instance.studentId] = true;
      uniqueList.push(instance);
    }
  }

  if (uniqueList.length === 0) {
    return null;
  }

  return (
    <>
      <h3 className="mt-4 text-2xl font-semibold">Transferred Students</h3>
      <Separator className="my-2" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {uniqueList.map((studentGroupTransferTrail) => (
          <StudentTransferTrailCard
            key={studentGroupTransferTrail.id}
            student={studentGroupTransferTrail.student}
            studentTrail={studentGroupTransferTrailData}
          />
        ))}
      </div>
    </>
  );
}
