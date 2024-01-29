import { ClinicalFeatureCard } from "#/app/(platform)/clinical-feature-card";
import { CasesReferredToMe } from "#/app/(platform)/screenings/components/cases-referred-to-me";
import { CreateClinicalCases } from "#/app/(platform)/screenings/components/create-clinical-cases";
import { ListViewOfClinicalCases } from "#/app/(platform)/screenings/components/view-clinical-cases";
import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";

export default async function Page() {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    return <div>Not a supervisor</div>;
  }

  const referredCases = await db.clinicalScreeningInfo.findMany({
    where: {
      referredToSupervisorId: supervisor?.id,
      acceptCase: false,
    },
    include: {
      student: true,
    },
  });

  const myCases = await db.clinicalScreeningInfo.findMany({
    where: {
      currentSupervisorId: supervisor?.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      student: true,
      sessions: {
        orderBy: {
          date: "desc",
        },
      },
    },
  });

  const schools = await db.school.findMany({
    where: {
      hubId: supervisor?.hubId,
    },
    include: {
      students: true,
      assignedSupervisor: {
        include: {
          fellows: {
            include: {
              students: true,
            },
          },
        },
      },
    },
  });

  const clinicalCases = await db.clinicalScreeningInfo.findMany({
    where: {
      currentSupervisorId: supervisor?.id,
    },
  });

  return (
    <div>
      <ClinicalFeatureCard clinicalCases={clinicalCases} />
      <CasesReferredToMe
        cases={referredCases}
        currentSupervisorId={supervisor?.id}
      />
      <CreateClinicalCases
        currentSupervisorId={supervisor?.id}
        schools={schools}
      />
      <ListViewOfClinicalCases cases={myCases} />
    </div>
  );
}
