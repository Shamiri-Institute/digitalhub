"use server";

import { currentClinicalLead } from "#/app/auth";
import {
  type FellowClinicalCasesData,
  fetchFellowClinicalCasesData,
} from "#/lib/actions/clinical/fellows";

export type { FellowClinicalCasesData };

export async function getFellowClinicalCasesData() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead) throw new Error("Unauthorized");

  return await fetchFellowClinicalCasesData({ hubId: clinicalLead.profile.assignedHubId });
}
