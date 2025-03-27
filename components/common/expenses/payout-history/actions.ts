"use server";

import { CreateProjectformSchema } from "#/components/common/expenses/payout-history/components/create-projects-form";
import { db } from "#/lib/db";
import * as z from "zod";
import type { HubWithProjects, PayoutSettingsFormData } from "./types";

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

export async function updatePayoutSettings(data: PayoutSettingsFormData) {
  try {
    for (const project of data.projectSettings) {
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

    return { success: true, message: "Payout settings updated successfully" };
  } catch (error) {
    console.error("Error updating payout settings:", error);
    return { success: false, message: "Failed to update payout settings" };
  }
}
