"use server";

import type { ImplementerRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/lib/db";

export async function selectPersonnel({
  identifier,
  role,
}: {
  identifier: string;
  role: ImplementerRole;
}) {
  const session = await getCurrentUserSession();
  if (!session) {
    return null;
  }
  const { activeMembership } = session.user;
  if (!activeMembership) {
    return null;
  }
  await db.implementerMember.update({
    where: { id: activeMembership.id, implementerId: activeMembership.implementerId },
    data: { identifier, role },
  });
  return { success: true };
}

export async function AcceptRefferedClinicalCase(
  currentSupervisorId: string,
  _referredToSupervisorId: string | null,
  caseId: string,
) {
  try {
    const caseHistory = await db.clinicalCaseTransferTrail.findFirst({
      where: {
        caseId: caseId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const caseHistoryId = caseHistory?.id;

    const currentcase = await db.clinicalScreeningInfo.update({
      where: {
        id: caseId,
      },

      data: {
        currentSupervisorId: currentSupervisorId,
        referredToSupervisorId: null,
        acceptCase: true,
        referralStatus: null,
        caseTransferTrail: {
          update: {
            where: {
              id: caseHistoryId,
            },
            data: {
              referralStatus: "Approved",
            },
          },
        },
      },
    });

    revalidatePath("/screenings");

    return { success: true, data: currentcase };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function RejectRefferedClinicalCase(caseId: string) {
  try {
    const caseHistory = await db.clinicalCaseTransferTrail.findFirst({
      where: {
        caseId: caseId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const caseHistoryId = caseHistory?.id;

    const currentcase = await db.clinicalScreeningInfo.update({
      where: {
        id: caseId,
      },
      data: {
        referredToSupervisorId: null,
        acceptCase: false,
        referralStatus: "Declined",
        caseTransferTrail: {
          update: {
            where: {
              id: caseHistoryId,
            },
            data: {
              referralStatus: "Declined",
            },
          },
        },
      },
    });

    revalidatePath("/screenings");
    return { success: true, data: currentcase };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function flagClinicalCaseForFollowUp(data: {
  caseId: string;
  reason: string;
  role: "CLINICAL_LEAD" | "SUPERVISOR";
}) {
  try {
    await db.clinicalScreeningInfo.update({
      where: {
        id: data.caseId,
      },
      data: {
        flagged: true,
        flaggedReason: data.reason,
      },
    });

    revalidatePath(`${data.role === "CLINICAL_LEAD" ? "/cl/clinical" : "/sc/clinical"}`);
    return { success: true };
  } catch {
    return { error: "Something went wrong" };
  }
}
