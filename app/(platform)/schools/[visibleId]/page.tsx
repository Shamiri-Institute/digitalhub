import { Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SchoolDemographics } from "#/app/(platform)/schools/[visibleId]/demographics";
import { FellowDropoutDialog } from "#/app/(platform)/schools/[visibleId]/dropout-dialog";
import { FellowAttendanceDot } from "#/app/(platform)/schools/[visibleId]/fellow-attendance-dot";
import { FellowModifyDialog } from "#/app/(platform)/schools/[visibleId]/fellow-modify-dialog";
import { RescheduleDialog } from "#/app/(platform)/schools/[visibleId]/reschedule-dialog";
import { currentSupervisor } from "#/app/auth";
import { Back } from "#/components/common/back";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { Icons } from "#/components/icons";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import { AttendanceStatus, SessionLabel, SessionNumber } from "#/types/app";
import type { FellowWithAttendance } from "#/types/prisma";

export default async function SchoolDetailPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const school = await db.school.findUnique({
    where: { visibleId },
    include: { hub: true, implementer: true, interventionSessions: true },
  });
  if (!school) {
    notFound();
  }

  const males = await db.student.count({
    where: { schoolId: school.id, gender: "M" },
  });

  const females = await db.student.count({
    where: { schoolId: school.id, gender: "F" },
  });

  const others = await db.student.count({
    where: { schoolId: school.id, gender: undefined },
  });

  const total = await db.student.count({ where: { schoolId: school.id } });

  const supervisor = await currentSupervisor();
  if (!supervisor) {
    return <InvalidPersonnelRole role="supervisor" />;
  }

  return (
    <main className="pt-2">
      <Header />
      <div className="relative">
        <SchoolDemographics males={males} females={females} others={others} />
        <div className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="text-center">
            <div className="text-sm">Students</div>
            <div className="text-2xl font-semibold">{total}</div>
            <div className="gap flex justify-around">
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-[#B7D4E8]" />
                <div>M</div>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-[#092142]" />
                <div>F</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="my-4">
        <div className="mx-auto flex max-w-[200px] justify-center text-center text-xl font-semibold">
          {school.schoolName}
        </div>
      </div>
      <div className="mx-auto my-4 max-w-[200px]">
        <div className="text-muted-foreground">Sessions</div>
        <div className="mt-1 flex gap-4">
          <div className="h-4 w-4 rounded-full bg-muted-green" />
          <div className="h-4 w-4 rounded-full bg-muted-green" />
          <div className="h-4 w-4 rounded-full bg-shamiri-red" />
        </div>
      </div>
      <div className="mt-8 text-2xl font-semibold">Fellows</div>
      <div className="mx-4 mt-8">
        <FellowsList school={school} supervisor={supervisor} />
      </div>
    </main>
  );
}

async function FellowsList({
  school,
  supervisor,
}: {
  school: Prisma.SchoolGetPayload<{
    include: { hub: true; implementer: true; interventionSessions: true };
  }>;
  supervisor: Prisma.SupervisorGetPayload<{}>;
}) {
  const fellows = await db.fellow.findMany({
    where: {
      supervisorId: supervisor.id,
    },
    include: { fellowAttendances: true, students: true },
    orderBy: {
      createdAt: "asc",
    },
  });

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {fellows.map((fellow) => {
        return (
          <FellowCard
            key={fellow.id}
            fellow={fellow}
            school={school}
            supervisor={supervisor}
            totalStudents={
              fellow.students.filter(
                (student) => student.schoolId === school.id,
              ).length
            }
          />
        );
      })}
    </div>
  );
}

function FellowCard({
  fellow,
  school,
  supervisor,
  totalStudents,
}: {
  fellow: FellowWithAttendance;
  school: Prisma.SchoolGetPayload<{
    include: { hub: true; implementer: true; interventionSessions: true };
  }>;
  supervisor: Prisma.SupervisorGetPayload<{}>;
  totalStudents: number;
}) {
  const filteredAttendances: FellowWithAttendance["attendances"][number][] =
    fellow.fellowAttendances.filter(
      (attendance: FellowWithAttendance["attendances"][number]) =>
        attendance.schoolId === school.id,
    );

  if (filteredAttendances.length !== 5) {
    console.warn(
      `Fellow ${fellow.fellowName} has ${filteredAttendances.length} attendances`,
    );
  }

  function getAttendanceStatus(sessionNumber: SessionNumber): AttendanceStatus {
    const attendance: FellowWithAttendance["attendances"][number] =
      filteredAttendances.find(
        (attendance: FellowWithAttendance["attendances"][number]) =>
          attendance.sessionNumber === sessionNumber,
      );
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

  const sessionItems: {
    status: AttendanceStatus;
    label: SessionLabel;
    session: Prisma.InterventionSessionGetPayload<{}> | null;
  }[] = [
    {
      status: getAttendanceStatus(0),
      label: "Pre",
      session:
        school.interventionSessions.find((ins) => ins.sessionType === "s0") ||
        null,
    },
    {
      status: getAttendanceStatus(1),
      label: "S1",
      session:
        school.interventionSessions.find((ins) => ins.sessionType === "s1") ||
        null,
    },
    {
      status: getAttendanceStatus(2),
      label: "S2",
      session:
        school.interventionSessions.find((ins) => ins.sessionType === "s2") ||
        null,
    },
    {
      status: getAttendanceStatus(3),
      label: "S3",
      session:
        school.interventionSessions.find((ins) => ins.sessionType === "s3") ||
        null,
    },
    {
      status: getAttendanceStatus(4),
      label: "S4",
      session:
        school.interventionSessions.find((ins) => ins.sessionType === "s4") ||
        null,
    },
  ];

  return (
    <div className="rounded border p-8 shadow-md">
      <div className="flex justify-between">
        <div className="flex gap-2">
          <h2 className="text-lg font-bold">{fellow.fellowName}</h2>
          {(fellow.droppedOutAt || fellow.droppedOut) && (
            <div>
              <span className="inline-flex items-center rounded-md bg-zinc-50 px-1.5 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10">
                Dropped Out
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-0.5">
          <RescheduleDialog fellow={fellow}>
            <Icons.calendar className="mr-4 h-6 w-6 cursor-pointer align-baseline text-brand" />
          </RescheduleDialog>
          <FellowModifyDialog
            mode="edit"
            fellow={fellow}
            info={{
              hubVisibleId: school?.hub?.visibleId!,
              supervisorVisibleId: supervisor.visibleId,
              implementerVisibleId: school?.implementer?.visibleId!,
              schoolVisibleIds: [school.visibleId],
            }}
          >
            <Icons.edit className="mr-4 h-6 w-6 cursor-pointer align-baseline text-brand" />
          </FellowModifyDialog>
          {(!fellow.droppedOutAt || !fellow.droppedOut) && (
            <FellowDropoutDialog
              fellow={fellow}
              revalidationPath={`/schools/${school.visibleId}`}
            >
              <Icons.delete className="h-6 w-6 cursor-pointer text-brand" />
            </FellowDropoutDialog>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Shamiri ID: {fellow.visibleId}
      </p>
      <Separator className="my-2" />

      <div className="mt-4 flex justify-between pb-2">
        {sessionItems.map((sessionItem, index) => (
          <FellowAttendanceDot
            key={index}
            sessionItem={sessionItem}
            fellow={fellow}
            school={school}
            supervisor={supervisor}
            recordTime={new Date()}
          />
        ))}
      </div>

      <Separator className="my-2" />
      <div className="mt-4 flex items-center justify-between text-sm">
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
      <div className="mt-8 rounded bg-shamiri-blue p-2 text-center text-white transition-all duration-300 hover:bg-shamiri-blue-darker active:scale-95">
        <Link
          href={`/schools/${school.visibleId}/students?fellowId=${fellow.visibleId}`}
          className="block w-full"
        >
          {totalStudents} Students
        </Link>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex justify-between">
      <Back />
      <div className="flex gap-2">
        <Icons.edit className="mr-4 h-6 w-6 align-baseline text-brand" />
        <Icons.search className="h-6 w-6 text-brand" strokeWidth={1.75} />
      </div>
    </header>
  );
}
