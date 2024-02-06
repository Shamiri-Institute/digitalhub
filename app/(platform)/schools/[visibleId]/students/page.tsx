import { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";

import { StudentDropoutDialog } from "#/app/(platform)/schools/[visibleId]/students/dropout-dialog";
import { StudentAttendanceDot } from "#/app/(platform)/schools/[visibleId]/students/student-attendance-dot";
import { StudentModifyDialog } from "#/app/(platform)/schools/[visibleId]/students/student-modify-dialog";
import { Back } from "#/components/common/back";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import { AttendanceStatus, SessionLabel } from "#/types/app";
import { StudentWithSchoolAndFellow } from "#/types/prisma";
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

  const students: StudentWithSchoolAndFellow[] = await db.student.findMany({
    where: { schoolId: school.id, fellowId: fellow.id },
    include: { fellow: true, school: true, studentComplaints: true },
    orderBy: { visibleId: "asc" },
  });

  const showStudentCreationButton = true;
  return (
    <main>
      <Header
        schoolName={school.schoolName}
        fellowName={fellow.fellowName ?? "N/A"}
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
        <StudentsList school={school} fellow={fellow} students={students} />
      </div>
    </main>
  );
}

function Header({
  schoolName,
  fellowName,
}: {
  schoolName: string;
  fellowName: string;
}) {
  return (
    <header className="flex items-center justify-between">
      <Back />
      <div className="flex flex-col items-center">
        <div className="text-2xl font-semibold">{schoolName}</div>
        <div className="text-lg">{fellowName}</div>
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
}: {
  school: Prisma.SchoolGetPayload<{}>;
  fellow: Prisma.FellowGetPayload<{
    include: {
      supervisor: true;
      implementer: true;
    };
  }>;
  students: StudentWithSchoolAndFellow[];
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
          />
        );
      })}
      {!students.length && (
        <div className="text-gray-500">No students found</div>
      )}
    </div>
  );
}

function StudentCard({
  student,
  school,
  fellow,
}: {
  student: StudentWithSchoolAndFellow;
  school: Prisma.SchoolGetPayload<{}>;
  fellow: Prisma.FellowGetPayload<{
    include: {
      supervisor: true;
      implementer: true;
    };
  }>;
}) {
  function getAttendanceStatus(attendance: boolean | null) {
    if (attendance === true) {
      return "present";
    }
    if (attendance === false) {
      return "absent";
    }
    if (attendance === null) {
      return "not-marked";
    }
    return "not-marked";
  }

  const sessionItems: { status: AttendanceStatus; label: SessionLabel }[] = [
    { status: getAttendanceStatus(student.attendanceSession0), label: "Pre" },
    { status: getAttendanceStatus(student.attendanceSession1), label: "S1" },
    { status: getAttendanceStatus(student.attendanceSession2), label: "S2" },
    { status: getAttendanceStatus(student.attendanceSession3), label: "S3" },
    { status: getAttendanceStatus(student.attendanceSession4), label: "S4" },
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
                  >
                    <div className="cursor-pointer">Edit Student</div>
                  </StudentModifyDialog>
                </div>

                <div>Sessions attended</div>
                <ComplaintDialog
                  fellowId={fellow.visibleId}
                  schoolId={school.visibleId}
                  studentId={student.id}
                  complaints={student.StudentComplaints}
                >
                  <div className="cursor-pointer">Record complaint</div>
                </ComplaintDialog>
                {!student.droppedOut || !student.droppedOutAt ? (
                  <StudentDropoutDialog student={student}>
                    <div className="cursor-pointer">Dropout student</div>
                  </StudentDropoutDialog>
                ) : null}
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
    </div>
  );
}
