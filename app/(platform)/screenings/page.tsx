import { CasesReferredToMe } from "#/app/(platform)/screenings/components/cases-referred-to-me";
import { CreateClinicalCases } from "#/app/(platform)/screenings/components/create-clinical-cases";
import { ListViewOfClinicalCases } from "#/app/(platform)/screenings/components/view-clinical-cases";
import { db } from "#/lib/db";

export default async function Page() {

  const referred_cases = await db.clinicalScreeningInfo.findMany({
    where: {
      referredToSupervisorId: "sup_01hkm7xfggej5rwjwkwafp3xwc",
      acceptCase: false,
    },
    include: {
      student: true,
    },
  });

  const my_cases = await db.clinicalScreeningInfo.findMany({
    where: {
      currentSupervisorId: "sup_01hkm7xfggej5rwjwkwafp3xwc",
      acceptCase: true,
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

  return (
    <div>
      <CasesReferredToMe cases={referred_cases} />
      <CreateClinicalCases />
      <ListViewOfClinicalCases cases={my_cases} />
    </div>
  )
}