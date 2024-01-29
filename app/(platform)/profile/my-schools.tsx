"use server";

import { SchoolCardProfile } from "#/app/(platform)/profile/components/school-card";
import { CurrentSupervisor } from "#/app/auth";
import { getSchoolsForSupervisor } from "#/lib/actions/get-schools-for-supervisor";
import { Prisma } from "@prisma/client";

type SchoolWithSessions = {
  school: Prisma.SchoolGetPayload<{}>;
  interventionSessions: Prisma.InterventionSessionGetPayload<{}>[];
};

export async function MySchools({
  supervisor,
}: {
  supervisor: NonNullable<CurrentSupervisor>;
}) {
  const fetchedSchools = await getSchoolsForSupervisor(supervisor);
  const schools: SchoolWithSessions[] = fetchedSchools || [];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:items-center  sm:gap-6">
        <h3 className="mt-4 text-base font-semibold text-brand xl:text-2xl">
          {supervisor.assignedSchools.length > 1 ? "My Schools" : "My School"}
        </h3>

        {schools.map(({ school, interventionSessions }) => (
          <SchoolCardProfile
            key={school.schoolName}
            school={school}
            sessionTypes={interventionSessions}
            fellowsCount={supervisor.fellows.length}
            assigned
          />
        ))}
      </div>
    </>
  );
}
