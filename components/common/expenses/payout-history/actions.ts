"use server";

import { CreateProjectformSchema } from "#/components/common/expenses/payout-history/components/create-projects-form";
import { db } from "#/lib/db";
import * as z from "zod";

export async function createProject(
  data: z.infer<typeof CreateProjectformSchema>,
) {
  try {
    const project = await db.project.create({
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
