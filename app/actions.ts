"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getCurrentUserSession } from "#/app/auth";
import { db, type Transaction } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { clinicalCaseTransferTrail, clinicalScreeningInfo, implementerMember } from "#/db/schema";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { constants } from "#/lib/constants";

export async function selectPersonnel({
  identifier,
  role,
}: {
  identifier: string;
  role: ImplementerRole;
}) {
  // An exported server action is a public endpoint in every build; the UI check is not a gate.
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
  const updated = await db
    .update(implementerMember)
    .set({ identifier, role })
    .where(
      and(
        eq(implementerMember.id, activeMembership.id),
        eq(implementerMember.userId, session.user.id ?? ""),
      ),
    )
    .returning({ id: implementerMember.id });
  if (updated.length === 0) {
    throw new Error("Membership not found");
  }
  return { success: true };
}

/** The latest transfer trail row of a case; the referral decision is recorded on it. */
async function latestTransferTrail(tx: Transaction, caseId: string) {
  const [trail] = await tx
    .select({ id: clinicalCaseTransferTrail.id })
    .from(clinicalCaseTransferTrail)
    .where(eq(clinicalCaseTransferTrail.caseId, caseId))
    .orderBy(desc(clinicalCaseTransferTrail.createdAt))
    .limit(1);
  if (!trail) {
    throw new Error(`No transfer trail for case ${caseId}`);
  }
  return trail;
}

export async function AcceptRefferedClinicalCase(
  currentSupervisorId: string,
  _referredToSupervisorId: string | null,
  caseId: string,
) {
  await requireAuthRole();
  try {
    const currentcase = await db.transaction(async (tx) => {
      const trail = await latestTransferTrail(tx, caseId);
      const [updatedCase] = await tx
        .update(clinicalScreeningInfo)
        .set({
          currentSupervisorId,
          referredToSupervisorId: null,
          acceptCase: true,
          referralStatus: null,
        })
        .where(eq(clinicalScreeningInfo.id, caseId))
        .returning();
      if (!updatedCase) {
        throw new Error(`Case ${caseId} not found`);
      }
      await tx
        .update(clinicalCaseTransferTrail)
        .set({ referralStatus: "Approved" })
        .where(eq(clinicalCaseTransferTrail.id, trail.id));
      return updatedCase;
    });

    revalidatePath("/screenings");

    return { success: true, data: currentcase };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function RejectRefferedClinicalCase(caseId: string) {
  await requireAuthRole();
  try {
    const currentcase = await db.transaction(async (tx) => {
      const trail = await latestTransferTrail(tx, caseId);
      const [updatedCase] = await tx
        .update(clinicalScreeningInfo)
        .set({
          referredToSupervisorId: null,
          acceptCase: false,
          referralStatus: "Declined",
        })
        .where(eq(clinicalScreeningInfo.id, caseId))
        .returning();
      if (!updatedCase) {
        throw new Error(`Case ${caseId} not found`);
      }
      await tx
        .update(clinicalCaseTransferTrail)
        .set({ referralStatus: "Declined" })
        .where(eq(clinicalCaseTransferTrail.id, trail.id));
      return updatedCase;
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
  await requireAuthRole();
  try {
    const updated = await db
      .update(clinicalScreeningInfo)
      .set({ flagged: true, flaggedReason: data.reason })
      .where(eq(clinicalScreeningInfo.id, data.caseId))
      .returning({ id: clinicalScreeningInfo.id });
    if (updated.length === 0) {
      throw new Error(`Case ${data.caseId} not found`);
    }

    revalidatePath(`${data.role === "CLINICAL_LEAD" ? "/cl/clinical" : "/sc/clinical"}`);
    return { success: true };
  } catch {
    return { error: "Something went wrong" };
  }
}
