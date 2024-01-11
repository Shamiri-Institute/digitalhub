import { CasesReferredToMe } from "#/app/(platform)/screenings/components/cases-referred-to-me";
import { CreateClinicalCases } from "#/app/(platform)/screenings/components/create-clinical-cases";
import { ListViewOfClinicalCases } from "#/app/(platform)/screenings/components/view-clinical-cases";
import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";

export default async function Page() {

  const supervisor = await currentSupervisor();


  const referred_cases = await db.clinicalScreeningInfo.findMany({
    where: {
      referredToSupervisorId: supervisor?.id,
      acceptCase: false,
    },
    include: {
      student: true,
    },
  });

  const my_cases = await db.clinicalScreeningInfo.findMany({
    where: {
      currentSupervisorId: supervisor?.id,
      // acceptCase: true,
    },
    include: {
      student: true,
      sessions: {
        orderBy: {
          date: "desc"
        }
      }
    },
  });

  console.log(my_cases);
  console.log(referred_cases);

  return (
    <div>
      <CasesReferredToMe cases={referred_cases} currentSupervisorId={supervisor.id} />
      <CreateClinicalCases />
      <ListViewOfClinicalCases cases={my_cases} />
    </div>
  )
}