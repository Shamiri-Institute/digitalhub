import { ClinicalFeatureCard } from "#/app/(platform)/clinical-feature-card";
import { CasesReferredToMe } from "#/app/(platform)/screenings/components/cases-referred-to-me";
import { CreateClinicalCases } from "#/app/(platform)/screenings/components/create-clinical-cases";
import { ListViewOfClinicalCases } from "#/app/(platform)/screenings/components/view-clinical-cases";
import { currentSupervisor } from "#/app/auth";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
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
      currentSupervisor: {
        include: {
          hub: true,
        },
      },
    },
  });

  const schools = await db.school.findMany({
    where: {
      hubId: supervisor?.hubId,
      hub: { project: { visibleId: CURRENT_PROJECT_ID } },
    },
    include: {
      students: true,
      interventionGroups: {
        include: {
          students: true,
        },
      },
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

  const fetchCasesForCurrentClinician = async () => {
    if (supervisor?.id === "Shamiri_CO") {
      return await db.clinicalScreeningInfo.findMany({
        include: {
          student: true,
          sessions: {
            orderBy: {
              date: "desc",
            },
          },
          currentSupervisor: {
            include: {
              hub: true,
            },
          },
        },
        where: {
          createdAt: {
            gte: new Date(2024, 0, 29), //date when sessions started
          },
        },
      });
    } else {
      return await db.clinicalScreeningInfo.findMany({
        include: {
          student: true,
          sessions: {
            orderBy: {
              date: "desc",
            },
          },
          currentSupervisor: {
            include: {
              hub: true,
            },
          },
        },
        where: {
          currentSupervisor: {
            hubId: supervisor?.hubId,
            createdAt: {
              gte: new Date(2024, 0, 29), //date when sessions started
            },
          },
        },
      });
    }
  };

  const allClinicalCases = await fetchCasesForCurrentClinician();

  function showAllCases() {
    // todo: to be dynamic once they have their own platforms
    if (supervisor?.id === "Shamiri_CO") {
      return true;
    }
    if (supervisor?.id === "COS24_001") {
      return true;
    }
    if (supervisor?.id === "COS24_002") {
      return true;
    }
    if (supervisor?.id === "COS24_003") {
      return true;
    }
    return false;
  }

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

      {showAllCases() ? (
        <section>
          <h3 className="mt-8 text-base font-semibold text-brand xl:text-2xl">
            All Clinical Cases: {allClinicalCases.length}
          </h3>
          <ListViewOfClinicalCases cases={allClinicalCases} />
        </section>
      ) : null}
    </div>
  );
}
