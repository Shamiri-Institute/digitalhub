"use server";

import { currentClinicalLead } from "#/app/auth";
import {
  fetchClinicalSessionsDataBreakdown,
  fetchOverallStudentsDataBreakdown,
  fetchStudentsDataBreakdown,
  fetchStudentsStatsBreakdown,
} from "#/lib/actions/clinical/students";

async function hubScope() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead) throw new Error("Unauthorized");

  return { hubId: clinicalLead.profile.assignedHubId };
}

export async function getOverallStudentsDataBreakdown() {
  return await fetchOverallStudentsDataBreakdown(await hubScope());
}

export async function getStudentsDataBreakdown() {
  return await fetchStudentsDataBreakdown(await hubScope());
}

export async function clinicalSessionsDataBreakdown() {
  return await fetchClinicalSessionsDataBreakdown(await hubScope());
}

export async function getStudentsStatsBreakdown() {
  return await fetchStudentsStatsBreakdown(await hubScope());
}
