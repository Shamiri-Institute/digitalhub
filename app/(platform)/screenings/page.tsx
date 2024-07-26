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
            gte: new Date("2024-05-20"), //date when sessions started
          },
        },
        orderBy: {
          currentSupervisor: {
            hub: {
              id: "asc",
            },
          },
        },
      });
    } else if (supervisor?.id === "COS24P2_002") {
      // assigned to 24P2_Hub_02 by default but we also need data for 24P2_Hub_06
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
            hub: { id: { in: ["24P2_Hub_02", "24P2_Hub_06"] } },
            createdAt: {
              gte: new Date("2024-05-20"), //date when p2 2024 sessions started
            },
          },
        },
      });
    } else if (supervisor?.id === "COS24P2_003") {
      // assigned to 24P2_Hub_03, 24P2_Hub_04
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
            hub: { id: { in: ["24P2_Hub_03", "24P2_Hub_04"] } },
            createdAt: {
              gte: new Date("2024-05-20"), //date when p2 2024 sessions started
            },
          },
        },
      });
    } else if (supervisor?.id === "COS24P2_001") {
      // assigned to 24P2_Hub_01, 24P2_Hub_05
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
            hub: { id: { in: ["24P2_Hub_01", "24P2_Hub_05"] } },
            createdAt: {
              gte: new Date("2024-05-20"), //date when p2 2024 sessions started
            },
          },
        },
      });
    } else if (supervisor?.id === "COS24P2_004") {
      // assigned to 24P2_Hub_10, 24P2_Hub_13
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
            hub: {
              id: { in: ["24P2_Hub_10", "24P2_Hub_13"] },
            },
            createdAt: {
              gte: new Date("2024-05-20"), //date when p2 2024 sessions started
            },
          },
        },
      });
    } else {
      return await db.clinicalScreeningInfo.findMany({
        include: {
          student: true,
          sessions: true,
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
              gte: new Date("2024-05-20"), //date when sessions started
            },
          },
        },
      });
    }
  };

  const fetchSchoolForCurrentClinician = async () => {
    if (supervisor?.id === "COS24P2_002") {
      // assigned to 24P2_Hub_02 by default but we also need data for 24P2_Hub_06
      return await db.school.findMany({
        where: {
          hub: { id: { in: ["24P2_Hub_02", "24P2_Hub_06"] } },
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
    } else if (supervisor?.id === "COS24P2_003") {
      // assigned to 24P2_Hub_03, 24P2_Hub_04
      return await db.school.findMany({
        where: {
          hub: { id: { in: ["24P2_Hub_03", "24P2_Hub_04"] } },
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
    } else if (supervisor?.id === "COS24P2_001") {
      // assigned to 24P2_Hub_01, 24P2_Hub_05
      return await db.school.findMany({
        where: {
          hub: { id: { in: ["24P2_Hub_01", "24P2_Hub_05"] } },
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
    } else if (supervisor?.id === "COS24P2_004") {
      console.log("4");
      // assigned to 24P2_Hub_10, 24P2_Hub_13
      return await db.school.findMany({
        where: {
          hub: {
            id: { in: ["24P2_Hub_10", "24P2_Hub_13"] },
          },
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
    } else {
      return await db.school.findMany({
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
    }
  };

  const schools = (await fetchSchoolForCurrentClinician()) || [];

  const allClinicalCases = await fetchCasesForCurrentClinician();

  function showAllCases() {
    // todo: to be dynamic once they have their own platforms
    if (supervisor?.id === "Shamiri_CO") {
      return true;
    }
    if (supervisor?.id === "COS24P2_002") {
      return true;
    }
    if (supervisor?.id === "COS24P2_003") {
      return true;
    }
    if (supervisor?.id === "COS24P2_001") {
      return true;
    }
    if (supervisor?.id === "COS24P2_004") {
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
          <ListViewOfClinicalCases
            cases={allClinicalCases}
            currentSupervisorId={supervisor?.id}
          />
        </section>
      ) : null}
    </div>
  );
}
