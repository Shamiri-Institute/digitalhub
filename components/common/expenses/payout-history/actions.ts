"use server";

import { HubCoordinatorFormData } from "#/components/common/expenses/payout-history/components/add-hub-coordinator-form";
import { CreateHubFormSchema } from "#/components/common/expenses/payout-history/components/create-hub-form";
import { createImplementerSchema } from "#/components/common/expenses/payout-history/components/create-implementer-form";
import { CreateProjectformSchema } from "#/components/common/expenses/payout-history/components/create-projects-form";
import {
  INTERVENTION_SESSION_TYPES,
  SUPERVISION_SESSION_TYPES,
  TRAINING_SESSION_TYPES,
} from "#/lib/app-constants/constants";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { Implementer, ImplementerRole, sessionTypes } from "@prisma/client";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import type {
  CreateSessionNameType,
  HubWithProjects,
  PayoutFrequencyType,
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
        id: objectId("proj"),
        name: data.projectName,
        startDate: data.startDate,
        endDate: data.endDate,
        funder: data.funder,
        budget: data.budget,
        visibleId: data.projectName.toLowerCase().replace(/ /g, "-"),
        projectPaymentRates: {
          create: {
            trainingSession: data.defaultRates.trainingSession,
            preSession: data.defaultRates.preSession,
            mainSession: data.defaultRates.mainSession,
            supervisionSession: data.defaultRates.supervisionSession,
          },
        },
      },
    });
    revalidatePath("/ops/reporting/expenses/payout-history");

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
        implementerId: true,
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
            projectPaymentRates: {
              select: {
                trainingSession: true,
                preSession: true,
                mainSession: true,
                supervisionSession: true,
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
    revalidatePath("/ops/reporting/expenses/payout-history");

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

export async function createHubCoordinator(data: HubCoordinatorFormData) {
  try {
    return await db.$transaction(async (tx) => {
      const userId = objectId("user");
      await tx.user.create({
        data: {
          id: userId,
          email: data.coordinatorEmail,
        },
      });

      const coordinatorId = objectId("hubc");

      await tx.implementerMember.create({
        data: {
          userId,
          implementerId: data.implementerId,
          role: ImplementerRole.HUB_COORDINATOR,
          identifier: coordinatorId,
        },
      });

      await tx.hubCoordinator.create({
        data: {
          id: coordinatorId,
          coordinatorName: data.coordinatorName,
          coordinatorEmail: data.coordinatorEmail,
          cellNumber: data.cellNumber,
          mpesaNumber: data.mpesaNumber,
          idNumber: data.idNumber,
          gender: data.gender,
          assignedHubId: data.assignedHubId,
          visibleId: coordinatorId,
          implementerId: data.implementerId,
          dateOfBirth: data.dateOfBirth,
          county: data.county,
          subCounty: data.subCounty,
          bankName: data.bankName,
          bankAccountNumber: data.bankAccountNumber,
          bankAccountName: data.bankAccountName,
          bankBranch: data.bankBranch,
          kra: data.kra,
          nhif: data.nhif,
          trainingLevel: data.trainingLevel,
        },
      });
      revalidatePath("/ops/reporting/expenses/payout-history");
      return {
        success: true,
        message: "Hub Coordinator created successfully",
      };
    });
  } catch (error) {
    console.error("Error creating hub coordinator:", error);
    return {
      success: false,
      message:
        "Failed to create hub coordinator, please check the data you provided",
    };
  }
}

export async function createImplementer(
  data: z.infer<typeof createImplementerSchema>,
) {
  try {
    const implementerId = objectId("imp");
    await db.implementer.create({
      data: {
        ...data,
        id: implementerId,
        visibleId: implementerId,
      },
    });
    revalidatePath("/ops/reporting/expenses/payout-history");
    return {
      success: true,
      message: "Implementer created successfully",
    };
  } catch (error) {
    console.error("Error creating implementer:", error);
    return {
      success: false,
      message: "Failed to create implementer",
    };
  }
}

export async function createHub(data: z.infer<typeof CreateHubFormSchema>) {
  try {
    const hubId = objectId("hub");

    await db.$transaction(async (tx) => {
      await tx.hub.create({
        data: {
          id: hubId,
          hubName: data.hubName,
          implementerId: data.implementerId,
          visibleId: hubId,
          projects: {
            connect: data.projectIds.map((id) => ({ id })),
          },
        },
      });

      // Create session names for each project based on their payment rates
      for (const projectId of data.projectIds) {
        const projectPaymentRates = await tx.projectPaymentRates.findUnique({
          where: {
            projectId: projectId,
          },
        });

        if (projectPaymentRates) {
          const sessionNamesToCreate: CreateSessionNameType = [];

          // training session names
          if (projectPaymentRates.trainingSession) {
            TRAINING_SESSION_VALUES.forEach((sessionType) => {
              sessionNamesToCreate.push({
                sessionName: `${sessionType}_${projectId.slice(0, 4)}`,
                sessionType: sessionTypes.TRAINING,
                sessionLabel: sessionType,
                amount: projectPaymentRates.trainingSession,
                currency: "KES",
                projectId: projectId,
                hubId: hubId,
              });
            });
          }

          // intervention session names
          if (
            projectPaymentRates.preSession ||
            projectPaymentRates.mainSession
          ) {
            INTERVENTION_SESSION_VALUES.forEach((sessionType) => {
              sessionNamesToCreate.push({
                sessionName: `${sessionType}_${projectId.slice(0, 4)}`,
                sessionType: sessionTypes.INTERVENTION,
                sessionLabel: sessionType,
                amount:
                  sessionType === "s0"
                    ? projectPaymentRates.preSession
                    : projectPaymentRates.mainSession,
                currency: "KES",
                projectId: projectId,
                hubId: hubId,
              });
            });
          }

          //  supervision session names
          if (projectPaymentRates.supervisionSession) {
            SUPERVISION_SESSION_VALUES.forEach((sessionType) => {
              sessionNamesToCreate.push({
                sessionName: `${sessionType}_${projectId.slice(0, 4)}`,
                sessionType: sessionTypes.SUPERVISION,
                sessionLabel: sessionType,
                amount: projectPaymentRates.supervisionSession,
                currency: "KES",
                projectId: projectId,
                hubId: hubId,
              });
            });
          }

          // Create all session names
          if (sessionNamesToCreate.length > 0) {
            await tx.sessionName.createMany({
              data: sessionNamesToCreate,
            });
          }
        }
      }
    });

    revalidatePath("/ops/reporting/expenses/payout-history");
    return {
      success: true,
      message: "Hub created successfully",
    };
  } catch (error) {
    console.error("Error creating hub:", error);
    return {
      success: false,
      message: "Failed to create hub",
    };
  }
}

export async function fetchProjects() {
  try {
    const projects = await db.project.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        endDate: {
          gte: new Date(),
        },
      },
      include: {
        payoutFrequencySettings: true,
      },
    });
    return projects || [];
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

export async function setPayoutFrequencySettings(data: PayoutFrequencyType) {
  try {
    const { projectId, payoutFrequency, payoutDays, payoutTime } = data;

    const existingSetting = await db.payoutFrequencySettings.findUnique({
      where: {
        projectId: projectId,
      },
    });

    if (existingSetting) {
      await db.payoutFrequencySettings.update({
        where: {
          id: existingSetting.id,
        },
        data: {
          frequency: payoutFrequency,
          days: payoutDays,
          time: payoutTime,
        },
      });
    } else {
      await db.payoutFrequencySettings.create({
        data: {
          projectId: projectId,
          frequency: payoutFrequency,
          days: payoutDays,
          time: payoutTime,
        },
      });
    }

    revalidatePath("/ops/reporting/expenses/payout-history");
    return {
      success: true,
      message: "Payout frequency settings updated successfully",
    };
  } catch (error) {
    console.error("Error setting payout frequency settings:", error);
    return {
      success: false,
      message: "Failed to set payout frequency settings",
    };
  }
}
