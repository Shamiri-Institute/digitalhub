"use server";

import { ImplementerRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentUserSession } from "#/app/auth";
import { constants } from "#/lib/constants";
import { db } from "#/lib/db";

export async function selectPersonnel({
  identifier,
  role,
}: {
  identifier: string;
  role: ImplementerRole;
}) {
  // Development tooling for the role switcher. The client hides the switcher outside development,
  // but an exported server action is a public endpoint in every build, so the gate lives here.
  if (constants.NEXT_PUBLIC_ENV !== "development") {
    throw new Error("Role switching is only available in development");
  }
  if (!Object.values(ImplementerRole).includes(role)) {
    throw new Error("Invalid role");
  }
  const session = await getCurrentUserSession();
  if (!session) {
    return null;
  }
  const { activeMembership } = session.user;
  if (!activeMembership) {
    return null;
  }
  await db.implementerMember.update({
    where: { id: activeMembership.id, userId: session.user.id ?? "" },
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
