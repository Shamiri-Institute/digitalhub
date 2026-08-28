"use server";

import { currentClinicalTeam } from "#/app/auth";
import {
  fetchSupervisorClinicalCasesData,
  type SupervisorClinicalCasesData,
} from "#/lib/actions/clinical/supervisors";

export type { SupervisorClinicalCasesData };

export async function getSupervisorClinicalCasesData() {
  const clinicalTeam = await currentClinicalTeam();
  if (!clinicalTeam) throw new Error("Unauthorized");

  const projectId = clinicalTeam?.profile.assignedHub?.projectId;
  if (!projectId) {
    throw new Error("Assigned hub has no project");
  }

  return await fetchSupervisorClinicalCasesData({ projectId });
}
