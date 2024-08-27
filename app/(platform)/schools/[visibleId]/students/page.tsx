import StudentTransferTrail from "#/app/(platform)/schools/[visibleId]/students/components/student-transfer-trail";
import { SingleHistory } from "#/app/(platform)/schools/[visibleId]/students/components/student-transfer-trail-card";
import { StudentDropoutDialog } from "#/app/(platform)/schools/[visibleId]/students/dropout-dialog";
import { StudentAttendanceDot } from "#/app/(platform)/schools/[visibleId]/students/student-attendance-dot";
import { StudentModifyDialog } from "#/app/(platform)/schools/[visibleId]/students/student-modify-dialog";
import { StudentUndoDropoutDialog } from "#/app/(platform)/schools/[visibleId]/students/undo-dropout-dialog";
import { Back } from "#/components/common/back";
import { Icons } from "#/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import { AttendanceStatus, SessionLabel, SessionNumber } from "#/types/app";
import { Prisma } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ComplaintDialog from "./record-complaint-dialog";

export default async function SchoolStudentsPage({
  params: { visibleId },
  searchParams,
}: {
  params: { visibleId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const school = await db.school.findUnique({
    where: { visibleId },
    include: {
      interventionGroups: true,
    },
  });
  if (!school) {
    notFound();
  }

  const fellowVisibleId = searchParams?.fellowId as string | undefined;
  const fellow = await db.fellow.findUnique({
    where: { visibleId: fellowVisibleId },
    include: { supervisor: true, implementer: true },
  });
  if (!fellow) {
    notFound();
  }

  const fellowGroup = school.interventionGroups.find(
    (group) => group.leaderId === fellow.id,
  );

  const students = await db.student.findMany({
    where: { schoolId: school.id },
    include: {
      school: true,
      fellow: {
        include: {
          supervisor: true,
          implementer: true,
        },
      },
      supervisor: true,
      implementer: true,
      studentComplaints: true,
      studentAttendances: { include: { session: true } },
      studentGroupTransferTrail: true,
    },
    orderBy: { visibleId: "asc" },
  });

  console.log({ students });

  const fellowGroupInfo = fellowGroup
    ? { groupId: fellowGroup.id, groupName: fellowGroup.groupName }
    : undefined;

  const showStudentCreationButton = true;
  return (
    <main>
      <Header
        schoolName={school.schoolName}
        fellowName={fellow.fellowName ?? "N/A"}
        groupName={fellowGroup?.groupName ?? "N/A"}
      />
      <div className="mt-8">
        <div className="mx-4 flex justify-between border-b border-border/50 pb-3">
          <div className="text-2xl font-semibold">Students</div>
          {showStudentCreationButton && (
            <StudentModifyDialog
              mode="create"
              fellowName={fellow.fellowName ?? "N/A"}
              schoolName={school.schoolName}
              info={{
                schoolVisibleId: school.visibleId,
                fellowVisibleId: fellow.visibleId,
                supervisorVisibleId: fellow.supervisor?.visibleId!,
                implementerVisibleId: fellow.implementer?.visibleId!,
              }}
              group={fellowGroupInfo}
            >
              <button className="transition-transform active:scale-95">
                <Icons.plusCircle
                  className="h-6 w-6 text-shamiri-blue"
                  strokeWidth={1.5}
                />
              </button>
            </StudentModifyDialog>
          )}
        </div>
      </div>
      <div className="mx-4 mt-8">
        <StudentsList
          school={school}
          fellow={fellow}
          students={students}
          group={fellowGroupInfo}
        />
      </div>
      <Suspense
        fallback={
          <div>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          </div>
        }
      >
        <StudentTransferTrail schoolId={school.id} group={fellowGroupInfo} />
      </Suspense>
    </main>
  );
}

function Header({
  schoolName,
  fellowName,
  groupName,
}: {
  schoolName: string;
  fellowName: string;
  groupName: string;
}) {
  return (
    <header className="flex items-center justify-between">
      <Back />
      <div className="flex flex-col items-center">
        <div className="text-2xl font-semibold">{schoolName}</div>
        <div className="text-lg">{fellowName}</div>
        <div className="text-sm text-muted-foreground">Group: {groupName}</div>
      </div>
      <div className="flex gap-2">
        <Icons.search className="h-6 w-6 text-brand" strokeWidth={1.75} />
      </div>
    </header>
  );
}

function StudentsList({
  school,
  fellow,
  students,
  group,
}: {
  school: Prisma.SchoolGetPayload<{}>;
  fellow: Prisma.FellowGetPayload<{
    include: {
      supervisor: true;
      implementer: true;
    };
  }>;
  students: Prisma.StudentGetPayload<{
    include: {
      school: true;
      fellow: true;
      supervisor: true;
      implementer: true;
      studentComplaints: true;
      studentAttendances: {
        include: {
          session: true;
        };
      };
      studentGroupTransferTrail: true;
    };
  }>[];
  group?: { groupId: string; groupName: string };
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {students.map((student) => {
        return (
          <StudentCard
            key={student.id}
            student={student}
            school={school}
            fellow={fellow}
            group={group}
          />
        );
      })}
      {!students.length && (
        <div className="text-gray-500">No students found</div>
      )}
    </div>
  );
}

function getAttendanceStatus(
  attendances: Prisma.StudentAttendanceGetPayload<{
    include: { session: true };
  }>[],
  sessionNumber: SessionNumber,
): AttendanceStatus {
  const studentAttendances = attendances
    .filter(
      (attendance) => attendance.session.sessionType === `s${sessionNumber}`,
    )
    .sort((a, b) => a.id - b.id); // sort by id
  const attendance = studentAttendances[studentAttendances.length - 1]; // pick most recent record -> for duplicate attendances
  if (attendance?.attended === true) {
    return "present";
  }
  if (attendance?.attended === false) {
    return "absent";
  }
  if (attendance?.attended === null) {
    return "not-marked";
  }
  return "not-marked";
}

function StudentCard({
  student,
  school,
  fellow,
  group,
}: {
  student: Prisma.StudentGetPayload<{
    include: {
      school: true;
      fellow: true;
      supervisor: true;
      implementer: true;
      studentComplaints: true;
      studentAttendances: {
        include: {
          session: true;
        };
      };
      studentGroupTransferTrail: true;
    };
  }>;
  school: Prisma.SchoolGetPayload<{}>;
  fellow: Prisma.FellowGetPayload<{
    include: {
      supervisor: true;
      implementer: true;
    };
  }>;
  group?: { groupId: string; groupName: string };
}) {
  const sessionItems: { status: AttendanceStatus; label: SessionLabel }[] = [
    {
      status: getAttendanceStatus(student.studentAttendances, 0),
      label: "Pre",
    },
    { status: getAttendanceStatus(student.studentAttendances, 1), label: "S1" },
    { status: getAttendanceStatus(student.studentAttendances, 2), label: "S2" },
    { status: getAttendanceStatus(student.studentAttendances, 3), label: "S3" },
    { status: getAttendanceStatus(student.studentAttendances, 4), label: "S4" },
  ];

  return (
    <div className="rounded-lg border p-8 shadow-md">
      <div className="flex justify-between">
        <div className="flex gap-2">
          <h2 className="text-lg font-bold">{student.studentName || "N/A"}</h2>
          {student.droppedOut && (
            <div>
              <span className="inline-flex items-center rounded-md bg-zinc-50 px-1.5 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10">
                Dropped Out
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-0.5">
          <div>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Icons.moreHorizontal className="h-5 w-5 text-brand" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="space-y-4 p-4">
                <div>
                  <StudentModifyDialog
                    mode="edit"
                    student={student}
                    fellowName={fellow.fellowName ?? "N/A"}
                    schoolName={school.schoolName}
                    info={{
                      schoolVisibleId: school.visibleId,
                      fellowVisibleId: fellow.visibleId,
                      supervisorVisibleId: fellow.supervisor?.visibleId!,
                      implementerVisibleId: fellow.implementer?.visibleId!,
                    }}
                    group={group}
                  >
                    <div className="cursor-pointer">Edit Student</div>
                  </StudentModifyDialog>
                </div>

                {/* <div>Sessions attended</div> */}

                <ComplaintDialog
                  fellowId={fellow.visibleId}
                  schoolId={school.visibleId}
                  studentId={student.id}
                  complaints={student.studentComplaints}
                >
                  <div className="cursor-pointer">Record complaint</div>
                </ComplaintDialog>
                {!student.droppedOut || !student.droppedOutAt ? (
                  <StudentDropoutDialog student={student}>
                    <div className="cursor-pointer">Dropout student</div>
                  </StudentDropoutDialog>
                ) : (
                  <StudentUndoDropoutDialog
                    student={student}
                    revalidationPath={`/students?fellowId=${fellow?.visibleId}`}
                  >
                    <div className="cursor-pointer">Undo Dropout</div>
                  </StudentUndoDropoutDialog>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-600">
        Shamiri ID: {student.visibleId}
      </p>
      <Separator className="my-2" />
      <div className="mt-4 flex justify-between">
        {sessionItems.map((session, index) => (
          <StudentAttendanceDot
            key={index}
            session={session}
            student={student}
            group={group}
            fellowId={fellow.id}
          />
        ))}
      </div>
      <Separator className="my-2" />
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <div className={`h-3 w-3 rounded-full bg-[#85A070]`}></div>
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`h-3 w-3 rounded-full bg-[#DE5E68]`}></div>
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`h-3 w-3 rounded-full bg-gray-300`}></div>
          <span>Not marked</span>
        </div>
      </div>
      {student?.studentGroupTransferTrail?.length > 0 && (
        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value={`id-${student.visibleId}`}>
            <AccordionTrigger className={"items-right pt-0"}>
              <span className="text-brand">View group transfer history</span>
            </AccordionTrigger>

            <AccordionContent>
              <ol className="list-decimal text-brand">
                {student.studentGroupTransferTrail.map((transfer) => (
                  <SingleHistory
                    key={transfer.id}
                    referredFrom={transfer?.fromGroupId!}
                    referredTo={transfer.currentGroupId}
                    date={transfer.createdAt}
                  />
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
