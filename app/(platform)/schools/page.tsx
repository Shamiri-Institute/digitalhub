import { currentSupervisor } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { Icons } from "#/components/icons";
import { db } from "#/lib/db";
import { SchoolCard } from "./school-card";

export default function SchoolsPage() {
  return (
    <>
      <Header />
      <SchoolsList />
    </>
  );
}

function Header() {
  return (
    <div className="mt-4 flex items-center justify-between py-4 lg:mt-0">
      <div className="bg-green flex items-center align-middle">
        <Icons.schoolMinusOutline className="mr-4 h-6 w-6 align-baseline text-brand" />
        <h3 className="text-2xl font-semibold text-brand">Schools</h3>
      </div>
      <Icons.search className="mr-4 h-6 w-6 align-baseline text-brand" />
    </div>
  );
}

async function SchoolsList() {
  const supervisor = await currentSupervisor();
  if (!supervisor) {
    return <InvalidPersonnelRole role="supervisor" />;
  }
  const { assignedSchool } = supervisor;

  const otherSchools = await db.school.findMany({
    where: {
      visibleId: { not: assignedSchool.visibleId },
      hubId: assignedSchool.hubId,
    },
    include: {
      interventionSessions: true,
      _count: {
        select: {
          students: true,
        },
      },
    },
  });

  return (
    <div>
      <div>
        <h2 className="py-3 text-xl font-semibold">My School</h2>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          <SchoolCard
            key={assignedSchool.id}
            school={assignedSchool}
            fellowsCount={supervisor.fellows.length}
            sessionTypes={assignedSchool.interventionSessions}
            studentCount={supervisor.assignedSchool._count.students}
            assigned
          />
          <div />
          <div />
        </div>
      </div>
      <div>
        <h2 className="py-3 text-xl font-semibold">Others</h2>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {otherSchools.map((school) => (
            <SchoolCard
              key={school.schoolName}
              school={school}
              studentCount={school._count?.students}
              sessionTypes={school.interventionSessions}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
