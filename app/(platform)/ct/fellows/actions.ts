"use server";

import { currentClinicalTeam } from "#/app/auth";
import {
  type FellowClinicalCasesData,
  fetchFellowClinicalCasesData,
} from "#/lib/actions/clinical/fellows";

export type { FellowClinicalCasesData };

export async function getFellowClinicalCasesData() {
  const clinicalTeam = await currentClinicalTeam();
  if (!clinicalTeam) throw new Error("Unauthorized");

  const projectId = clinicalTeam?.profile.assignedHub?.projectId;
  if (!projectId) {
    throw new Error("Hub has no project");
  }

  return await fetchFellowClinicalCasesData({ projectId });
}
