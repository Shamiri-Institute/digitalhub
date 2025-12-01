"use server";

import { ImplementerRole } from "@prisma/client";
import type { z } from "zod";
import { getCurrentUserSession } from "#/app/auth";
import type { ProfileSchema } from "#/components/profile/schema";
import { db } from "#/lib/db";

export async function updateSupervisorProfile(data: z.infer<typeof ProfileSchema>) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }
    const role = session.user.activeMembership?.role;
    if (role !== ImplementerRole.SUPERVISOR) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }

    const supervisor = await db.supervisor.findFirst({
      where: {
        id: session.user.activeMembership?.identifier ?? undefined,
      },
    });

    if (!supervisor) {
      return {
        success: false,
        message: "Supervisor not found",
      };
    }

    await db.supervisor.update({
      where: {
        id: supervisor.id,
      },
      data: {
        supervisorName: data.name,
        idNumber: data.idNumber,
        cellNumber: data.cellNumber,
        mpesaNumber: data.mpesaNumber,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        county: data.county,
        subCounty: data.subCounty,
        bankName: data.bankName,
        bankBranch: data.bankBranch,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountName: data.bankAccountName,
        kra: data.kra,
      },
    });

    return {
      success: true,
      message: "Profile updated successfully",
    };
  } catch (error) {
    console.error("Error updating supervisor profile:", error);
    return {
      success: false,
      message: "Failed to update profile",
    };
  }
}

export async function updateHubCoordinatorProfile(data: z.infer<typeof ProfileSchema>) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }

    const role = session.user.activeMembership?.role;
    if (role !== ImplementerRole.HUB_COORDINATOR) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }

    const coordinator = await db.hubCoordinator.findFirst({
      where: {
        id: session.user.activeMembership?.identifier ?? undefined,
      },
    });

    if (!coordinator) {
      return {
        success: false,
        message: "Hub coordinator not found",
      };
    }

    await db.hubCoordinator.update({
      where: {
        id: coordinator.id,
      },
      data: {
        coordinatorName: data.name,
        idNumber: data.idNumber,
        cellNumber: data.cellNumber,
        mpesaNumber: data.mpesaNumber,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        county: data.county,
        subCounty: data.subCounty,
        bankName: data.bankName,
        bankBranch: data.bankBranch,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountName: data.bankAccountName,
        kra: data.kra,
      },
    });

    return {
      success: true,
      message: "Profile updated successfully",
    };
  } catch (error) {
    console.error("Error updating hub coordinator profile:", error);
    return {
      success: false,
      message: "Failed to update profile",
    };
  }
}

export async function updateFellowProfile(data: z.infer<typeof ProfileSchema>) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }
    const role = session.user.activeMembership?.role;
    if (role !== ImplementerRole.FELLOW) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }

    const fellow = await db.fellow.findFirst({
      where: {
        id: session.user.activeMembership?.identifier ?? undefined,
      },
    });

    if (!fellow) {
      return {
        success: false,
        message: "Fellow not found",
      };
    }

    await db.fellow.update({
      where: {
        id: fellow.id,
      },
      data: {
        fellowName: data.name,
        idNumber: data.idNumber,
        cellNumber: data.cellNumber,
        mpesaNumber: data.mpesaNumber,
        mpesaName: data.mpesaName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        county: data.county,
        subCounty: data.subCounty,
      },
    });

    return {
      success: true,
      message: "Profile updated successfully",
    };
  } catch (error) {
    console.error("Error updating fellow profile:", error);
    return {
      success: false,
      message: "Failed to update profile",
    };
  }
}

export async function updateClinicalLeadProfile(data: z.infer<typeof ProfileSchema>) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }

    const role = session.user.activeMembership?.role;
    if (role !== ImplementerRole.CLINICAL_LEAD) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }

    const clinicalLead = await db.clinicalLead.findFirst({
      where: {
        id: session.user.activeMembership?.identifier ?? undefined,
      },
    });

    if (!clinicalLead) {
      return {
        success: false,
        message: "Clinical lead not found",
      };
    }

    await db.clinicalLead.update({
      where: {
        id: clinicalLead.id,
      },
      data: {
        clinicalLeadName: data.name,
        cellNumber: data.cellNumber,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        county: data.county,
        subCounty: data.subCounty,
        bankName: data.bankName,
        bankBranch: data.bankBranch,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountName: data.bankAccountName,
        kra: data.kra,
      },
    });

    return {
      success: true,
      message: "Profile updated successfully",
    };
  } catch (error) {
    console.error("Error updating clinical lead profile:", error);
    return {
      success: false,
      message: "Failed to update profile",
    };
  }
}
