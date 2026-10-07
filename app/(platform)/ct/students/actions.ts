"use server";

import { currentClinicalTeam } from "#/app/auth";
import {
  fetchClinicalSessionsDataBreakdown,
  fetchOverallStudentsDataBreakdown,
  fetchStudentsDataBreakdown,
  fetchStudentsStatsBreakdown,
} from "#/lib/actions/clinical/students";

async function projectScope() {
  const clinicalTeam = await currentClinicalTeam();
  if (!clinicalTeam) throw new Error("Unauthorized");

  const projectId = clinicalTeam?.profile.assignedHub?.projectId;
  if (!projectId) {
    throw new Error("Assigned hub has no project");
  }
  return { projectId };
}

export async function getOverallStudentsDataBreakdown() {
  return fetchOverallStudentsDataBreakdown(await projectScope());
}

export async function getStudentsDataBreakdown() {
  return fetchStudentsDataBreakdown(await projectScope());
}

export async function clinicalSessionsDataBreakdown() {
  return fetchClinicalSessionsDataBreakdown(await projectScope());
}

export async function getStudentsStatsBreakdown() {
  return fetchStudentsStatsBreakdown(await projectScope());
}
