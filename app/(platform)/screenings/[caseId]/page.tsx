import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";
import CaseHeader from "./case-header";
import { CaseNotePlan } from "./case-notes-plan";
import { StudentCaseTabs } from "./student-case-tabs";

export default async function Page({ params }: { params: { caseId: string } }) {
  const supervisor = await currentSupervisor();

  const currentcase = await db.clinicalScreeningInfo.findUnique({
    where: {
      id: params.caseId,
    },
    include: {
      student: true,
      currentSupervisor: true,
      sessions: {
        orderBy: {
          date: "desc",
        },
      },
      caseTransferTrail: {
        orderBy: {
          createdAt: "desc",
        },
      },
      consultingClinicalExpert: true,
      referredToSupervisor: true,
    },
  });

  const all_supervisors = await db.supervisor.findMany({
    where: {
      hubId: supervisor?.hubId,
    },
    include: {
      fellows: true,
    },
  });

  const fellows = await db.fellow.findMany({
    where: {
      hubId: supervisor?.hubId,
    },
  });

  return (
    <div>
      {currentcase && <CaseHeader currentcase={currentcase} />}
      {currentcase && (
        <StudentCaseTabs
          currentcase={currentcase}
          supervisors={all_supervisors}
          currentSupId={supervisor?.id}
        />
      )}
      <CaseNotePlan />
    </div>
  );
}
