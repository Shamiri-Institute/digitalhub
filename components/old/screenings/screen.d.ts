import { Prisma } from "@prisma/client";

export type CurrentCase = Prisma.ClinicalScreeningInfoGetPayload<{
  include: {
    student: true;
    currentSupervisor: true;
    sessions: true;
    caseTransferTrail: true;
    consultingClinicalExpert: true;
    referredToSupervisor: true;
  };
}>;
