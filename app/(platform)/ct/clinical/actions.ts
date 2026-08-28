"use server";

import { currentClinicalTeam } from "#/app/auth";
import {
  fetchClinicalCasesChartData,
  fetchClinicalCasesList,
  type HubClinicalCases,
} from "#/lib/actions/clinical/cases";
import { getActiveProjectId } from "#/lib/active-project-id";

export type { HubClinicalCases };

export async function getAllClinicalCasesData() {
  const clinicalTeam = await currentClinicalTeam();
  if (!clinicalTeam) throw new Error("Unauthorized");

  const projectId = await getActiveProjectId();

  return await fetchClinicalCasesChartData({ projectId });
}

export async function getClinicalCasesInHub(): Promise<HubClinicalCases[]> {
  try {
    const clinicalTeam = await currentClinicalTeam();
    if (!clinicalTeam) throw new Error("Unauthorized");

    const projectId = await getActiveProjectId();

    return await fetchClinicalCasesList({ projectId }, clinicalTeam.profile.id);
  } catch (error) {
    console.error("Error fetching clinical cases:", error);
    return [];
  }
}
