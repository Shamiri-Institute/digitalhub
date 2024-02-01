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
  const { assignedSchools } = supervisor;

  const otherSchools = await db.school.findMany({
    where: {
      visibleId: {
        notIn: assignedSchools.map((school) => school.visibleId),
      },
      hubId: {
        in: assignedSchools.length
          ? assignedSchools
              .filter((school) => school.hubId !== null)
              .map((school) => school.hubId as string)
          : supervisor.hubId
          ? [supervisor.hubId]
          : [],
      },
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

  const activeFellowsCount = (
    await db.fellowAttendance.groupBy({
      by: ["fellowId"],
      where: {
        supervisorId: supervisor.id,
        schoolId: {
          in: assignedSchools.map((school) => school.id),
        },
        attended: true,
      },
      _sum: {
        id: true,
      },
    })
  ).length;

  return (
    <div>
      <div>
        <h2 className="py-3 text-xl font-semibold">My School</h2>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {assignedSchools.map((school) => (
            <SchoolCard
              key={school.id}
              school={school}
              fellowsCount={activeFellowsCount}
              sessionTypes={school.interventionSessions}
              studentCount={school._count.students}
              assigned
            />
          ))}
          {assignedSchools.length > 1 ? (
            <>
              <div />
            </>
          ) : assignedSchools.length === 0 ? (
            <div className="text-left font-medium text-gray-500">
              No assigned schools
            </div>
          ) : (
            <>
              <div />
              <div />
            </>
          )}
        </div>
      </div>
      <div>
        <h2 className="py-3 text-xl font-semibold">Others</h2>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {otherSchools.map(async (school) => {
            const activeFellowsCount = (
              await db.fellowAttendance.groupBy({
                by: ["fellowId"],
                where: {
                  supervisorId: supervisor.id,
                  schoolId: school.id,
                  attended: true,
                },
                _sum: {
                  id: true,
                },
              })
            ).length;
            return (
              <SchoolCard
                key={school.schoolName}
                school={school}
                studentCount={school._count?.students}
                fellowsCount={activeFellowsCount}
                sessionTypes={school.interventionSessions}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
