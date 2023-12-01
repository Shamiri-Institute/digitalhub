import { SchoolCardProfile } from "#/app/(platform)/profile/components/school-card";
import { CurrentSupervisor, currentHub, currentSupervisor } from "#/app/auth";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { db } from "#/lib/db";
import { cn, getInitials } from "#/lib/utils";
import Link from "next/link";
import { ReimbursementRequests } from "./reimbursement-requests";
import { differenceInYears } from "date-fns";

const sessionTypes = ["Pre", "S1", "S2", "S3", "S4"];

const fellowDetails = [
  {
    id: "FE_001",
    name: "Jean Kasudi",
    gender: "Female",
    cell_number: "0790-000-100",
    mpesa_number: "0792000000",
    hub: "Nairobi",
    county: "Nairobi",
    age: 18,
    sessions_attended: 7,
  },
  {
    id: "FE_003",

    name: "Faith Mwende",
    gender: "Female",
    cell_number: "0790-000-100",
    mpesa_number: "0792000000",
    hub: "Nairobi",
    county: "Nairobi",
    age: 23,
    sessions_attended: 16,
  },
  {
    id: "FE_005",

    name: "Innocent Kilonzo",
    gender: "Male",
    cell_number: "0790-000-100",
    mpesa_number: "0792000000",
    hub: "Nairobi",
    county: "Nairobi",
    age: 25,
    sessions_attended: 12,
  },
];

export default async function SupervisorProfile() {
  let supervisor = await currentSupervisor();

  const fellowsCount = (
    await db.fellowAttendance.groupBy({
      by: ["fellowId"],
      where: {
        supervisorId: supervisor.id,
        schoolId: supervisor.assignedSchoolId ?? undefined,
      },
      _sum: {
        id: true,
      },
    })
  ).length;

  // SELECT COUNT(*) FROM schools WHERE hub_id = 'hub_01hetrj9mhf8kbq9tcm3eyg66v';

  const schoolCount = await db.school.count({
    where: {
      hubId: supervisor.hubId,
    },
  });

  // STUDENT COUNT

  // SELECT * FROM fellows WHERE supervisor_id = current_supervisor_id INNER JOIN students ON fellows.id = students.fellow_id

  // SELECT fellows.fellow_name, students.student_name FROM fellows INNER JOIN students ON fellows.id = students.fellow_id WHERE fellows.supervisor_id = 'sup_01hetrjb41f80a5hee3430bh79';

  const studentCount = (
    await db.fellow.findMany({
      where: {
        supervisorId: supervisor.id,
      },
      include: {
        students: true,
      },
    })
  )
    .map((fellow) => fellow.students.length)
    .reduce((a, b) => a + b, 0);
  console.debug({ studentCount });

  let supervisorName = supervisor.supervisorName ?? "N/A";

  // console.log({ supervisor, fellowsCount, schoolCount })
  const reimbursementRequests = await db.reimbursementRequest.findMany({
    where: {
      supervisorId: supervisor.id,
    },
    orderBy: {
      incurredAt: "desc",
    },
  });

  return (
    <main>
      <IntroHeader />
      <ProfileHeader
        fellowsCount={fellowsCount}
        schoolCount={schoolCount}
        supervisorName={supervisorName}
        studentCount={studentCount}
      />
      <MySchools />
      <MyFellows fellows={supervisor.fellows} />
      <ReimbursementRequests requests={reimbursementRequests} />
    </main>
  );
}

function IntroHeader() {
  return (
    <div className="mt-2 flex items-center  justify-between">
      <div className="flex items-center">
        <Icons.user className="h-5 w-5 align-baseline text-brand xl:h-7 xl:w-7" />
        <h3 className="pl-3 text-base font-semibold text-brand xl:text-2xl">
          Profile
        </h3>
      </div>
      <Link href={"/profile/edit-profile"}>
        <Icons.edit className="h-5 w-5 align-baseline text-brand" />
      </Link>
    </div>
  );
}

function ProfileHeader({
  fellowsCount,
  schoolCount,
  supervisorName,
  studentCount,
}: {
  fellowsCount: number;
  schoolCount: number;
  supervisorName: string;
  studentCount: number;
}) {
  return (
    <div className="mt-10 flex flex-col items-center justify-center border-b ">
      <div className="my-4 flex h-32 w-32 items-center justify-center rounded-full bg-gray-400">
        <h3 className="self-center text-center text-4xl font-semibold text-shamiri-blue">
          {getInitials(supervisorName)}
        </h3>
      </div>
      <p className="pl-3 text-base font-semibold text-shamiri-blue-darker xl:text-2xl">
        {supervisorName}
      </p>
      <div className="my-4 flex">
        <div className="pr-4">
          <p className="text-base font-semibold text-shamiri-blue">
            {fellowsCount.toString().padStart(2, "0")}
          </p>
          <p className="text-xs text-brand">Fellows</p>
        </div>
        <div className=" border-l border-border/50 pl-4">
          <p className="text-base font-semibold text-shamiri-blue">
            {schoolCount.toString().padStart(2, "0")}
          </p>
          <p className="text-xs text-brand">Schools</p>
        </div>
        <div className=" border-l border-border/50 pl-4">
          <p className="text-base font-semibold text-shamiri-blue">
            {studentCount.toString().padStart(2, "0")}
          </p>
          <p className="text-xs text-brand">Students</p>
        </div>
      </div>
    </div>
  );
}

async function MySchools() {
  const hub = await currentHub();
  const assignedSchoolId = "ANS23_School_17";
  const assignedSchool = await db.school.findFirst({
    where: { visibleId: assignedSchoolId, hubId: hub!.id },
  });
  if (!assignedSchool) {
    throw new Error("Assigned school not found");
  }

  // TODO: what is this doing
  const otherSchools = await db.school.findMany({
    where: { visibleId: { not: assignedSchoolId }, hubId: hub!.id },
  });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:items-center  sm:gap-6">
        <h3 className="mt-4 text-base font-semibold text-brand xl:text-2xl">
          My School
        </h3>
        <SchoolCardProfile
          key={assignedSchool.schoolName}
          school={assignedSchool}
          sessionTypes={sessionTypes}
          assigned
        />
      </div>
    </>
  );
}

// only show fellows assigned to this supervisor
function MyFellows({ fellows }: { fellows: CurrentSupervisor['fellows'] }) {
  return (
    <>
      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-base font-semibold text-brand xl:text-2xl">
          My Fellows
        </h3>
        <button>
          <Icons.add className="h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:items-center  sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
        {fellows.map((fellow) => (
          <MyFellowCard key={fellow.id} fellow={fellow} />
        ))}
      </div>
    </>
  );
}

// todo: fix types
function MyFellowCard({
  fellow,
  assigned,
}: {
  fellow: CurrentSupervisor['fellows'][number];
  assigned?: boolean;
}) {
  return (
    <Card
      className={cn("mb-4 flex flex-col gap-5 p-5 pr-3.5", {
        "bg-white": !assigned,
        "bg-brand": assigned,
      })}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-4 border-b border-border/50 pb-3 pr-3",
          "grid grid-cols-[15fr,10fr]",
          {
            "border-border/20": assigned,
          },
        )}
      >
        <div>
          <h3 className={cn("font-semibold text-brand xl:text-xl")}>
            {fellow.fellowName}
          </h3>
          <p className="text-xs font-medium text-muted-foreground xl:text-lg">
            Shamiri ID: {fellow.visibleId}
          </p>
        </div>
        <div className={cn("flex items-start justify-end  pl-4")}>
          <Link href={`#`} className="flex flex-col gap-[1px]">
            <div>
              <Icons.moreHorizontal className="h-5 w-5 text-brand" />
            </div>
          </Link>
        </div>
      </div>

      <div className="flex flex-col ">
        <div className="flex justify-between">
          <div className="flex flex-col ">
            <div className="flex justify-start gap-2">
              <p className="text-base font-medium text-muted-foreground xl:text-lg">
                Age:
              </p>
              <p className="text-base font-semibold text-brand xl:text-lg">
                {fellow.dateOfBirth ? differenceInYears(new Date(), fellow.dateOfBirth) : 'N/A'}
              </p>
            </div>
            <div className="flex justify-start gap-2">
              <p className="text-base font-medium text-muted-foreground xl:text-lg">
                Gender:
              </p>
              <p className="text-base font-semibold text-brand xl:text-lg">
                {fellow.gender}
              </p>
            </div>
            <div className="flex justify-start gap-2">
              <p className="text-base font-medium text-muted-foreground xl:text-lg">
                Contact:
              </p>
              <p className="text-base font-semibold text-brand xl:text-lg">
                {fellow.cellNumber}
              </p>
            </div>
            <div className="flex justify-start gap-2">
              <p className="text-base font-medium text-muted-foreground xl:text-lg">
                Mpesa:
              </p>
              <p className="text-base font-semibold text-brand xl:text-lg">
                {fellow.mpesaNumber}
              </p>
            </div>
            <div className="flex justify-start gap-2">
              <p className="text-base font-medium text-muted-foreground xl:text-lg">
                Hub:
              </p>
              <p className="text-base font-semibold text-brand xl:text-lg">
                {fellow.hub?.hubName}
              </p>
            </div>
            <div className="flex justify-start gap-2">
              <p className="text-base font-medium text-muted-foreground xl:text-lg">
                County:
              </p>
              <p className="text-base font-semibold text-brand xl:text-lg">
                {fellow.county ?? 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end justify-end">
            <h2 className="self-end text-right text-5xl font-semibold text-shamiri-blue">
              {fellow.fellowAttendances.reduce((acc, val) => val.attended ? acc + 1 : acc, 0)}
            </h2>
            <p className="text-right text-xs font-medium text-brand">
              Sessions attended
            </p>
          </div>
        </div>
        {/* TODO: this should take you to the /groups */}
        <Button className="mt-4 w-full bg-shamiri-blue hover:bg-brand">
          Groups
        </Button>
      </div>
    </Card>
  );
}
