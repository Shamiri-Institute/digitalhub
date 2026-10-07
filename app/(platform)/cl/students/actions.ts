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
  return fetchOverallStudentsDataBreakdown(await hubScope());
}

export async function getStudentsDataBreakdown() {
  return fetchStudentsDataBreakdown(await hubScope());
}

export async function clinicalSessionsDataBreakdown() {
  return fetchClinicalSessionsDataBreakdown(await hubScope());
}

export async function getStudentsStatsBreakdown() {
  return fetchStudentsStatsBreakdown(await hubScope());
}
