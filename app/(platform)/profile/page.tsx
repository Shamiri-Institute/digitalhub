import Link from "next/link";

import { CurrentSupervisor, currentSupervisor } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { Icons } from "#/components/icons";
import { db } from "#/lib/db";
import { getInitials } from "#/lib/utils";
import { FellowModifyDialog } from "../schools/[visibleId]/fellow-modify-dialog";
import FellowCard from "./components/fellow-card";
import { MySchools } from "./my-schools";
import { ReimbursementRequests } from "./reimbursement-requests";

export default async function SupervisorProfile() {
  let supervisor = await currentSupervisor();
  if (!supervisor) {
    return <InvalidPersonnelRole role="supervisor" />;
  }

  const fellowsCount = supervisor.fellows.length;

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

  let supervisorName = supervisor.supervisorName ?? "N/A";

  const reimbursementRequests = await db.reimbursementRequest.findMany({
    where: {
      supervisorId: supervisor.id,
    },
    orderBy: {
      incurredAt: "desc",
    },
  });

  const implementer = await db.implementer.findFirst({
    where: {
      id: supervisor.hub?.implementerId,
    },
  });

  return (
    <main className="max-w-3xl">
      <IntroHeader />
      <ProfileHeader
        fellowsCount={fellowsCount}
        schoolCount={schoolCount}
        supervisorName={supervisorName}
        studentCount={studentCount}
      />

      <MySchools supervisor={supervisor} />

      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-base font-semibold text-brand xl:text-2xl">
          My Fellows
        </h3>
        <FellowModifyDialog
          mode="create"
          info={{
            hubVisibleId: supervisor.hub?.visibleId!,
            supervisorVisibleId: supervisor.visibleId,
            implementerVisibleId: implementer?.visibleId!,
            schoolVisibleIds: supervisor.assignedSchools.map(
              (school) => school.visibleId,
            ),
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

      <MyFellows fellows={supervisor.fellows} />
      <ReimbursementRequests requests={reimbursementRequests} />
    </main>
  );
}

function IntroHeader() {
  return (
    <div className="mt-2 flex items-center justify-between">
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
      <div className="my-4 flex divide-x divide-border">
        <div className="w-full px-3">
          <p className="text-center text-base font-semibold text-shamiri-blue lg:text-lg xl:text-xl">
            {fellowsCount.toString().padStart(2, "0")}
          </p>
          <p className="text-center text-xs text-brand lg:text-base xl:text-lg">
            Fellows
          </p>
        </div>
        <div className="w-full px-3">
          <p className="text-center text-base font-semibold text-shamiri-blue lg:text-lg xl:text-xl">
            {schoolCount.toString().padStart(2, "0")}
          </p>
          <p className="text-center text-xs text-brand lg:text-base xl:text-lg">
            Schools
          </p>
        </div>
        <div className="w-full px-3">
          <p className="text-center text-base font-semibold text-shamiri-blue lg:text-lg xl:text-xl">
            {studentCount.toString().padStart(2, "0")}
          </p>
          <p className="text-center text-xs text-brand lg:text-base xl:text-lg">
            Students
          </p>
        </div>
      </div>
    </div>
  );
}

function MyFellows({
  fellows,
}: {
  fellows: NonNullable<CurrentSupervisor>["fellows"];
}) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:items-center sm:gap-6 md:grid-cols-2">
      {fellows.map((fellow) => (
        <FellowCard key={fellow.id} fellow={fellow} />
      ))}
    </div>
  );
}
