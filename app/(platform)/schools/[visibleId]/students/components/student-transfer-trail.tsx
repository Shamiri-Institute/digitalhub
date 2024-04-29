import { StudentTransferTrailCard } from "#/app/(platform)/schools/[visibleId]/students/components/student-transfer-trail-card";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";

export default async function StudentTransferTrail({
  schoolId,
}: {
  schoolId: string;
}) {
  const studentGroupTransferTrail = await db.studentGroupTransferTrail.findMany(
    {
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
    },
  );

  const studentTrail = studentGroupTransferTrail.filter(
    (studentGroupTransferTrail) => {
      return (
        studentGroupTransferTrail.studentId ===
        studentGroupTransferTrail.studentId
      );
    },
  );

  return (
    <>
      <h3 className="mt-4 text-2xl font-semibold">Transferred Students</h3>
      <Separator className="my-2" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {studentGroupTransferTrail.map((studentGroupTransferTrail) => (
          <StudentTransferTrailCard
            key={studentGroupTransferTrail.id}
            student={studentGroupTransferTrail.student}
            studentTrail={studentTrail}
          />
        ))}
      </div>
    </>
  );
}
