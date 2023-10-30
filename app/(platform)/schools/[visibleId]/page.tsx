import { notFound } from "next/navigation";

import { SchoolDemographics } from "#/app/(platform)/schools/[visibleId]/demographics";
import { DropoutDialog } from "#/app/(platform)/schools/[visibleId]/dropout-dialog";
import { FellowModifyDialog } from "#/app/(platform)/schools/[visibleId]/fellow-modify-dialog";
import { currentSupervisor } from "#/app/auth";
import { Icons } from "#/components/icons";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import type { FellowWithAttendance } from "#/types/prisma";
import { Prisma } from "@prisma/client";

export default async function SchoolDetailPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const school = await db.school.findUnique({
    where: { visibleId },
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
          <div className="h-4 w-4 rounded-full bg-[#DE5E68]" />
        </div>
      </div>
      <div className="mt-8">
        <div className="mx-4 flex justify-between border-b border-border/50 pb-3">
          <div className="text-2xl font-semibold">Fellows</div>
          <FellowModifyDialog
            mode="create"
            fellow={{
              hubId: school.hubId,
              supervisorId: supervisor.id,
              implementerId: school.implementerId,
            }}
          >
            <button className="transition-transform active:scale-95">
              <Icons.plusCircle
                className="h-6 w-6 text-shamiri-blue"
                strokeWidth={1.5}
              />
            </button>
          </FellowModifyDialog>
        </div>
      </div>
      <div className="mx-4 mt-8">
        <FellowsList school={school} />
      </div>
    </main>
  );
}

type SchoolFindUniqueOutput = NonNullable<
  Prisma.PromiseReturnType<typeof db.school.findUnique>
>;

async function FellowsList({ school }: { school: SchoolFindUniqueOutput }) {
  const fellows = await db.fellow.findMany({
    where: {
      fellowAttendances: { some: { schoolId: school.id } },
    },
    include: { fellowAttendances: true },
  });

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {fellows.map((fellow) => (
        <FellowCard
          key={fellow.id}
          fellow={fellow}
          school={school}
          presentCount={13}
          totalStudents={15}
        />
      ))}
    </div>
  );
}

function FellowCard({
  fellow,
  school,
  totalStudents,
  presentCount,
}: {
  fellow: FellowWithAttendance;
  school: SchoolFindUniqueOutput;
  totalStudents: number;
  presentCount: number;
}) {
  const filteredAttendances: FellowWithAttendance["attendances"][number][] =
    fellow.fellowAttendances.filter(
      (attendance: FellowWithAttendance["attendances"][number]) =>
        attendance.schoolId === school.id,
    );

  if (filteredAttendances.length !== 5) {
    console.error(
      `Fellow ${fellow.fellowName} has ${filteredAttendances.length} attendances`,
    );
  }

  function getAttendanceStatus(sessionNumber: number) {
    const attendance: FellowWithAttendance["attendances"][number] =
      filteredAttendances.find(
        (attendance: FellowWithAttendance["attendances"][number]) =>
          attendance.sessionNumber === sessionNumber,
      );
    if (!attendance) {
      return "not-marked";
    }
    if (attendance.attended) {
      return "present";
    }
    if (attendance.attended === false) {
      return "absent";
    }
    return "not-marked";
  }

  const sessionItems = [
    { status: getAttendanceStatus(0), label: "Pre" },
    { status: getAttendanceStatus(1), label: "S1" },
    { status: getAttendanceStatus(2), label: "S2" },
    { status: getAttendanceStatus(3), label: "S3" },
    { status: getAttendanceStatus(4), label: "S4" },
  ];

  return (
    <div className="rounded border p-8 shadow-md">
      <div className="flex justify-between">
        <h2 className="text-lg font-bold">{fellow.fellowName}</h2>
        <div className="flex gap-0.5">
          <FellowModifyDialog mode="edit" fellow={fellow}>
            <Icons.edit className="mr-4 h-6 w-6 cursor-pointer align-baseline text-brand" />
          </FellowModifyDialog>
          <DropoutDialog fellow={fellow}>
            <Icons.delete
              className="h-6 w-6 cursor-pointer text-brand"
              strokeWidth={2.5}
            />
          </DropoutDialog>
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Shamiri ID: {fellow.visibleId}
      </p>
      <Separator className="my-2" />
      <div className="mt-4 flex justify-between">
        {sessionItems.map((session, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="text-sm text-muted-foreground">{session.label}</div>
            <div
              className={`h-5 w-5 rounded-full ${
                session.status === "present"
                  ? "bg-[#85A070]"
                  : session.status === "absent"
                  ? "bg-[#DE5E68]"
                  : "bg-gray-300"
              } mx-1`}
            ></div>
          </div>
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
      <div className="mt-8 rounded bg-shamiri-blue p-2 text-center text-white">
        {presentCount}/{totalStudents} Students
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex justify-between">
      <button>
        <Icons.chevronLeft className="mr-4 h-6 w-6 align-baseline text-brand" />
      </button>
      <div className="flex gap-2">
        <Icons.edit className="mr-4 h-6 w-6 align-baseline text-brand" />
        <Icons.search className="h-6 w-6 text-brand" strokeWidth={1.75} />
      </div>
    </header>
  );
}
