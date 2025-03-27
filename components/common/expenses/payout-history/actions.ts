"use server";

import { CreateProjectformSchema } from "#/components/common/expenses/payout-history/components/create-projects-form";
import {
  INTERVENTION_SESSION_TYPES,
  SUPERVISION_SESSION_TYPES,
  TRAINING_SESSION_TYPES,
} from "#/lib/app-constants/constants";
import { db } from "#/lib/db";
import { Implementer, sessionTypes } from "@prisma/client";
import * as z from "zod";
import type {
  CreateSessionNameType,
  HubWithProjects,
  PayoutSettingsFormData,
} from "./types";

const INTERVENTION_SESSION_VALUES: INTERVENTION_SESSION_TYPES[] = [
  "s0",
  "s1",
  "s2",
  "s3",
  "s4",
];
const SUPERVISION_SESSION_VALUES: SUPERVISION_SESSION_TYPES[] = [
  "sv1",
  "sv2",
  "sv3",
  "sv4",
  "sv5",
];
const TRAINING_SESSION_VALUES: TRAINING_SESSION_TYPES[] = [
  "t1",
  "t2",
  "t3",
  "t4",
  "t5",
];

export async function createProject(
  data: z.infer<typeof CreateProjectformSchema>,
) {
  try {
    await db.project.create({
      data: {
        name: data.projectName,
        estimatedStartDate: data.startDate,
        estimatedEndDate: data.endDate,
        actualStartDate: data.startDate,
        actualEndDate: data.endDate,
        funder: data.funder,
        budget: data.budget,
        visibleId: data.projectName.toLowerCase().replace(/ /g, "-"),
        projectImplementers: {
          create: {
            implementerId: data.implementerId,
          },
        },
        hubs: {
          connect: data.hubIds.map((hubId) => ({ id: hubId })),
        },
      },
    });

    return { success: true, message: "Project created successfully" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to create project" };
  }
}

export async function fetchHubsWithProjects(): Promise<HubWithProjects[]> {
  try {
    const hubs = await db.hub.findMany({
      where: {
        archivedAt: null,
      },
      select: {
        id: true,
        hubName: true,
        projects: {
          select: {
            id: true,
            name: true,
            sessions: {
              select: {
                id: true,
                sessionName: true,
                sessionLabel: true,
                sessionType: true,
                amount: true,
              },
            },
          },
        },
      },
    });
    return hubs;
  } catch (error) {
    console.error("Error fetching hubs with projects:", error);
    throw new Error("Failed to fetch hubs with projects");
  }
}
export async function fetchImplementers(): Promise<Implementer[]> {
  try {
    const implementers = await db.implementer.findMany();
    return implementers;
  } catch (error) {
    console.error("Error fetching implementers:", error);
    throw new Error("Failed to fetch implementers");
  }
}

export async function updatePayoutSettings(data: PayoutSettingsFormData) {
  try {
    if (data.projectSettings) {
      for (const project of data.projectSettings) {
        if (!project.sessionSettings.length) {
          const defaultRates = data.defaultRates?.[project.projectId];
          if (defaultRates) {
            const sessionNamesToCreate: CreateSessionNameType = [];

            if (defaultRates.trainingSession) {
              TRAINING_SESSION_VALUES.forEach((sessionType) => {
                sessionNamesToCreate.push({
                  sessionName: `${sessionType}_${project.projectId.slice(0, 4)}`,
                  sessionType: sessionTypes.TRAINING,
                  sessionLabel: sessionType,
                  amount: defaultRates.trainingSession,
                  currency: "KES",
                  projectId: project.projectId,
                  hubId: data.hubId,
                });
              });
            }

            if (defaultRates.preSession || defaultRates.mainSession) {
              INTERVENTION_SESSION_VALUES.forEach((sessionType) => {
                sessionNamesToCreate.push({
                  sessionName: `${sessionType}_${project.projectId.slice(0, 4)}`,
                  sessionType: sessionTypes.INTERVENTION,
                  sessionLabel: sessionType,
                  amount:
                    sessionType === "s0"
                      ? defaultRates.preSession!
                      : defaultRates.mainSession!,
                  currency: "KES",
                  projectId: project.projectId,
                  hubId: data.hubId,
                });
              });
            }

            if (defaultRates.supervisionSession) {
              SUPERVISION_SESSION_VALUES.forEach((sessionType) => {
                sessionNamesToCreate.push({
                  sessionName: `${sessionType}_${project.projectId.slice(0, 4)}`,
                  sessionType: sessionTypes.SUPERVISION,
                  sessionLabel: sessionType,
                  amount: defaultRates.supervisionSession,
                  currency: "KES",
                  projectId: project.projectId,
                  hubId: data.hubId,
                });
              });
            }

            await db.sessionName.createMany({
              data: sessionNamesToCreate,
            });
          }
          continue;
        }

        // existing session settings
        for (const session of project.sessionSettings) {
          await db.sessionName.update({
            where: {
              id: session.sessionId,
            },
            data: {
              amount: session.amount,
            },
          });
        }
      }
    }

    return {
      success: true,
      message: "Payout settings updated successfully",
    };
  } catch (error) {
    console.error("Error updating payout settings:", error);
    return {
      success: false,
      message: "Failed to update payout settings",
    };
  }
}
