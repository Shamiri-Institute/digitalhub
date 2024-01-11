import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";
import CaseHeader from "./case-header";
import { CaseNotePlan } from "./case-notes-plan";
import { StudentCaseTabs } from "./student-case-tabs";


export default async function Page({ params }: { params: { caseId: string } }) {

  const supervisor = await currentSupervisor();


  const currentcase = await db.clinicalScreeningInfo.findUnique({
    where: {
      id: params.caseId
    },
    include: {
      student: true,
      sessions: {
        orderBy: {
          date: "desc"
        }
      },
      caseTransferTrail: true,
      consultingClinicalExpert: true,
      // currentSupervisor:true,
      referredToSupervisor: true,

    }
  })

  const supervisors = await db.supervisor.findMany({
    where: {
      hubId: supervisor?.hubId
    }
  })


  return (
    <div>
      <CaseHeader currentcase={currentcase} />
      <StudentCaseTabs currentcase={currentcase} supervisors={supervisors} />
      <CaseNotePlan />
    </div>

  )

}






