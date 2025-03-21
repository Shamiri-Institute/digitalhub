"use server";

import { currentClinicalLead } from "#/app/auth";
import { db } from "#/lib/db";

export async function getClinicalCasesData() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead) throw new Error("Unauthorized");

  // Get cases by status
  const casesByStatus = await db.clinicalScreeningInfo.groupBy({
    by: ['caseStatus'],
    where: {
      currentSupervisor:{
        hubId: clinicalLead.assignedHubId
      }
    },
    _count: true,
  });

  // Get cases by risk status
  const casesByRiskStatus = await db.clinicalScreeningInfo.groupBy({
    by: ['riskStatus'],
    where: {
      currentSupervisor:{
        hubId: clinicalLead.assignedHubId
      }
    },
    _count: true,
  });

  // Get cases by session
  const sessionTypes = ['pre', 's1', 's2', 's3', 's4', 'f1', 'f2', 'f3', 'f4'];
  const casesBySession = await db.clinicalSessionAttendance.groupBy({
    by: ['session'],
    where: {
      case: {
        currentSupervisor:{
          hubId: clinicalLead.assignedHubId
        }
      }
    },
    _count: true,
  });

  // Get cases by supervisor
  const casesBySupervisor = await db.clinicalScreeningInfo.groupBy({
    by: ['currentSupervisorId'],
    where: {
      currentSupervisor:{
        hubId: clinicalLead.assignedHubId
      }
    },
    _count: true,
  });

  const supervisors = await db.supervisor.findMany({
    where: {
      id: {
        in: casesBySupervisor.map(c => c.currentSupervisorId)
      }
    },
    select: {
      id: true,
      supervisorName: true
    }
  });

  return {
    casesByStatus: casesByStatus.map(status => ({
      name: status.caseStatus,
      value: status._count
    })),
    casesByRiskStatus: casesByRiskStatus.map(status => ({
      name: status.riskStatus,
      value: status._count
    })),
    casesBySession: sessionTypes.map(session => ({
      name: session,
      total: casesBySession.find(s => s.session === session)?._count ?? 0
    })),
    casesBySupervisor: casesBySupervisor.map(supervisor => {
      const sup = supervisors.find(s => s.id === supervisor.currentSupervisorId);
      const names = sup?.supervisorName?.split(' ') ?? ['', ''];
      return {
        name: `${names[0]?.[0] ?? ''}${names[1]?.[0] ?? ''}`,
        total: supervisor._count
      }
    })
  };
}