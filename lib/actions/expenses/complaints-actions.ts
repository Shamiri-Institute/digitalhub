"use server";

import { ImplementerRole, type Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  currentHubCoordinator,
  currentOpsUser,
  currentSupervisor,
  getCurrentUserSession,
} from "#/app/auth";
import {
  ApproveComplaintSchema,
  type ComplaintFormSchema,
  CreateComplaintSchema,
  RejectComplaintSchema,
} from "#/components/common/expenses/complaints/schema";
import {
  createPaymentComplaint,
  loadComplaintContext,
  resolveComplaint,
} from "#/lib/actions/expenses/complaints";
import { getActiveProjectId } from "#/lib/active-project-id";

type ComplaintActor = {
  /** Fellows whose complaints this user may raise, approve or reject. */
  scope: Prisma.FellowWhereInput;
  /** The user's complaints route, revalidated after a successful write. */
  path: string;
  /** The user's payout-history route, where complaints are raised from. */
  payoutPath: string;
};

/**
 * Hub coordinators, supervisors and ops users all reach these dialogs from the
 * same shared table, so the actions resolve the caller's role themselves rather
 * than each role re-exporting an identical set. The scope mirrors the filter
 * each role's loader uses, so a user can only act on fellows they can already
 * see.
 */
async function currentComplaintActor(): Promise<ComplaintActor | null> {
  const session = await getCurrentUserSession();
  const role = session?.user.activeMembership?.role;

  if (role === ImplementerRole.HUB_COORDINATOR) {
    const hubCoordinator = await currentHubCoordinator();
    const assignedHubId = hubCoordinator?.profile.assignedHubId;

    if (!assignedHubId) {
      return null;
    }

    return {
      scope: { hubId: assignedHubId },
      path: "/hc/reporting/expenses/complaints",
      payoutPath: "/hc/reporting/expenses/payout-history",
    };
  }

  if (role === ImplementerRole.SUPERVISOR) {
    const supervisor = await currentSupervisor();
    const supervisorId = supervisor?.profile.id;

    if (!supervisorId) {
      return null;
    }

    return {
      scope: { supervisorId },
      path: "/sc/reporting/expenses/complaints",
      payoutPath: "/sc/reporting/expenses/payout-history",
    };
  }

  if (role === ImplementerRole.OPERATIONS) {
    const opsUser = await currentOpsUser();
    const implementerId = opsUser?.session.user.activeMembership?.implementerId;

    if (!implementerId) {
      return null;
    }

    return {
      scope: {
        implementerId,
        hub: { projectId: await getActiveProjectId() },
      },
      path: "/ops/reporting/expenses/complaints",
      payoutPath: "/ops/reporting/expenses/payout-history",
    };
  }

  return null;
}

async function reviewComplaint(
  data: { id: string; formData: ComplaintFormSchema },
  status: "APPROVED" | "REJECTED",
) {
  const actor = await currentComplaintActor();

  if (!actor) {
    return {
      success: false,
      message: "You are not allowed to review complaints",
    };
  }

  // The reason is only collected in the confirm dialog, so re-check it here
  // instead of trusting the client to have validated the right one.
  const schema = status === "APPROVED" ? ApproveComplaintSchema : RejectComplaintSchema;
  const parsed = schema.safeParse(data.formData);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please fill all required fields",
    };
  }

  const result = await resolveComplaint({ ...data, scope: actor.scope }, status);

  if (result.success) {
    revalidatePath(actor.path);
  }

  return result;
}

export async function approveComplaint(data: { id: string; formData: ComplaintFormSchema }) {
  return reviewComplaint(data, "APPROVED");
}

export async function rejectComplaint(data: { id: string; formData: ComplaintFormSchema }) {
  return reviewComplaint(data, "REJECTED");
}

export async function createComplaint(data: {
  fellowId: string;
  payoutDate: Date;
  formData: ComplaintFormSchema;
}) {
  const actor = await currentComplaintActor();

  if (!actor) {
    return {
      success: false,
      message: "You are not allowed to raise complaints",
    };
  }

  const parsed = CreateComplaintSchema.safeParse(data.formData);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please fill all required fields",
    };
  }

  const result = await createPaymentComplaint({
    fellowId: data.fellowId,
    payoutDate: data.payoutDate,
    formData: parsed.data,
    scope: actor.scope,
  });

  if (result.success) {
    // Raised from payout-history, but it shows up on the complaints report.
    revalidatePath(actor.path);
    revalidatePath(actor.payoutPath);
  }

  return result;
}

/** Figures for the add-complaint dialog, once a fellow has been chosen. */
export async function fetchComplaintContext(fellowId: string) {
  const actor = await currentComplaintActor();

  if (!actor) {
    return null;
  }

  return loadComplaintContext({ fellowId, scope: actor.scope });
}
