"use server";

import { eq } from "drizzle-orm";
import type { z } from "zod";

import { getCurrentUserSession } from "#/app/auth";
import type { ProfileSchema } from "#/components/profile/schema";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { clinicalLead, fellow, hubCoordinator, supervisor } from "#/db/schema";

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

    const identifier = session.user.activeMembership?.identifier;
    const updated = identifier
      ? await db
          .update(supervisor)
          .set({
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
          })
          .where(eq(supervisor.id, identifier))
          .returning({ id: supervisor.id })
      : [];

    if (updated.length === 0) {
      return {
        success: false,
        message: "Supervisor not found",
      };
    }

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

    const identifier = session.user.activeMembership?.identifier;
    const updated = identifier
      ? await db
          .update(hubCoordinator)
          .set({
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
          })
          .where(eq(hubCoordinator.id, identifier))
          .returning({ id: hubCoordinator.id })
      : [];

    if (updated.length === 0) {
      return {
        success: false,
        message: "Hub coordinator not found",
      };
    }

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

    const identifier = session.user.activeMembership?.identifier;
    const updated = identifier
      ? await db
          .update(fellow)
          .set({
            fellowName: data.name,
            idNumber: data.idNumber,
            cellNumber: data.cellNumber,
            mpesaNumber: data.mpesaNumber,
            mpesaName: data.mpesaName,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            county: data.county,
            subCounty: data.subCounty,
          })
          .where(eq(fellow.id, identifier))
          .returning({ id: fellow.id })
      : [];

    if (updated.length === 0) {
      return {
        success: false,
        message: "Fellow not found",
      };
    }

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

    const identifier = session.user.activeMembership?.identifier;
    const updated = identifier
      ? await db
          .update(clinicalLead)
          .set({
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
          })
          .where(eq(clinicalLead.id, identifier))
          .returning({ id: clinicalLead.id })
      : [];

    if (updated.length === 0) {
      return {
        success: false,
        message: "Clinical lead not found",
      };
    }

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
