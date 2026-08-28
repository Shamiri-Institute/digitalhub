"use server";

import { currentClinicalLead } from "#/app/auth";
import {
  fetchSupervisorClinicalCasesData,
  type SupervisorClinicalCasesData,
} from "#/lib/actions/clinical/supervisors";

export type { SupervisorClinicalCasesData };

export async function getSupervisorClinicalCasesData() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead) throw new Error("Unauthorized");

  return await fetchSupervisorClinicalCasesData({ hubId: clinicalLead.profile.assignedHubId });
}
