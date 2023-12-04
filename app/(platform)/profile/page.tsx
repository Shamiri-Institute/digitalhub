import { SchoolCardProfile } from "#/app/(platform)/profile/components/school-card";
import { CurrentSupervisor, currentHub, currentSupervisor } from "#/app/auth";
import { Icons } from "#/components/icons";
import { db } from "#/lib/db";
import { getInitials } from "#/lib/utils";
import Link from "next/link";
import FellowCard from "./components/fellow-card";
import { ReimbursementRequests } from "./reimbursement-requests";

const sessionTypes = ["Pre", "S1", "S2", "S3", "S4"];

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
function MyFellows({ fellows }: { fellows: CurrentSupervisor["fellows"] }) {
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
          <FellowCard key={fellow.id} fellow={fellow} />
        ))}
      </div>
    </>
  );
}
