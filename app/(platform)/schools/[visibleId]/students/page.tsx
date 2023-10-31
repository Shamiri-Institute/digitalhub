import { notFound } from "next/navigation";

import { StudentAttendanceDot } from "#/app/(platform)/schools/[visibleId]/students/student-attendance-dot";
import { Icons } from "#/components/icons";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import { AttendanceStatus, SessionLabel } from "#/types/app";

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
  });
  if (!fellow) {
    notFound();
  }

  const students = await db.student.findMany({
    where: { schoolId: school.id, fellowId: fellow.id },
  });

  return (
    <main>
      <Header
        schoolName={school.schoolName}
        fellowName={fellow.fellowName ?? "N/A"}
      />
      <div className="mt-8">
        <div className="mx-4 flex justify-between border-b border-border/50 pb-3">
          <div className="text-2xl font-semibold">Students</div>
          <button className="transition-transform active:scale-95">
            <Icons.plusCircle
              className="h-6 w-6 text-shamiri-blue"
              strokeWidth={1.5}
            />
          </button>
        </div>
      </div>
      <div className="mx-4 mt-8">
        <StudentsList school={school} students={students} />
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
    <header className="flex justify-between">
      <button>
        <Icons.chevronLeft className="mr-4 h-6 w-6 align-baseline text-brand" />
      </button>
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

function StudentsList({ school, students }: { school: any; students: any[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {students.map((student) => {
        return <StudentCard key={student.id} student={student} />;
      })}
    </div>
  );
}

function StudentCard({ student }: { student: any }) {
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
    <div className="rounded border p-8 shadow-md">
      <div className="flex justify-between">
        <h2 className="text-lg font-bold">{student.studentName || "N/A"}</h2>
        <div className="flex gap-0.5">
          <button>
            <Icons.edit className="mr-4 h-6 w-6 cursor-pointer align-baseline text-brand" />
          </button>
          <button>
            <Icons.delete className="h-6 w-6 cursor-pointer text-brand" />
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-600">
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
