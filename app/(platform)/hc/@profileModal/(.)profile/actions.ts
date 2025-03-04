"use server"

import { db } from "#/lib/db"
import { currentHubCoordinator } from "#/app/auth"
import { z } from "zod"
import { HubCoordinatorSchema } from "./schema"

export async function getHubCoordinatorProfileData() {
  try {
    const user = await currentHubCoordinator()
    if (!user) throw new Error("Hub Coordinator not found")

    const profile = await db.hubCoordinator.findUnique({
      where: { id: user.id },
      select: {
        coordinatorEmail: true,
        coordinatorName: true,
        idNumber: true,
        cellNumber: true,
        mpesaNumber: true,
        dateOfBirth: true,
        gender: true,
        county: true,
        subCounty: true,
        bankName: true,
        bankBranch: true,
      },
    })

    if (!profile) return null

    const dateString = profile.dateOfBirth
      ? profile.dateOfBirth.toISOString()
      : ""

    return {
      ...profile,
      dateOfBirth: dateString,
    }
  } catch (error) {
    console.error("Error fetching hub coordinator profile:", error)
    throw new Error("Failed to fetch hub coordinator profile")
  }
}

export async function updateHubCoordinatorProfile(
  formData: z.infer<typeof HubCoordinatorSchema>
) {
  try {
    const user = await currentHubCoordinator()
    if (!user?.id) {
      return { success: false, message: "Unauthorized" }
    }

    const data = HubCoordinatorSchema.parse(formData)

    const dateValue = data.dateOfBirth ? new Date(data.dateOfBirth) : null
    if (dateValue && isNaN(dateValue.getTime())) {
      return { success: false, message: "Invalid date format" }
    }

    const updated = await db.hubCoordinator.update({
      where: { id: user.id },
      data: {
        coordinatorEmail: data.coordinatorEmail,
        coordinatorName: data.coordinatorName,
        idNumber: data.idNumber,
        cellNumber: data.cellNumber,
        mpesaNumber: data.mpesaNumber,
        dateOfBirth: dateValue,
        gender: data.gender,
        county: data.county,
        subCounty: data.subCounty,
        bankName: data.bankName,
        bankBranch: data.bankBranch,
      },
    })

    return { success: true, data: updated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors,
        message: "Validation Error",
      }
    }
    console.error("Error updating hub coordinator profile:", error)
    return { success: false, message: "Internal Server Error" }
  }
}
