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
  RejectComplaintSchema,
} from "#/components/common/expenses/complaints/schema";
import { resolveComplaint } from "#/lib/actions/expenses/complaints";
import { getActiveProjectId } from "#/lib/active-project-id";

type ComplaintReviewer = {
  /** Fellows whose complaints this reviewer may approve or reject. */
  scope: Prisma.FellowWhereInput;
  /** The reviewer's complaints route, revalidated after a successful review. */
  path: string;
};

/**
 * Hub coordinators, supervisors and ops users all review complaints through the
 * same dialog, so the action resolves the caller's role itself rather than each
 * role re-exporting an identical pair of actions. The scope mirrors the filter
 * each role's loader uses, so a reviewer can only act on complaints they can
 * already see.
 */
async function currentComplaintReviewer(): Promise<ComplaintReviewer | null> {
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
    };
  }

  return null;
}

async function reviewComplaint(
  data: { id: string; formData: ComplaintFormSchema },
  status: "APPROVED" | "REJECTED",
) {
  const reviewer = await currentComplaintReviewer();

  if (!reviewer) {
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
      message:
        status === "APPROVED"
          ? "Please enter the reason for accepting"
          : "Please enter the reason for rejecting",
    };
  }

  const result = await resolveComplaint({ ...data, scope: reviewer.scope }, status);

  if (result.success) {
    revalidatePath(reviewer.path);
  }

  return result;
}

export async function approveComplaint(data: { id: string; formData: ComplaintFormSchema }) {
  return reviewComplaint(data, "APPROVED");
}

export async function rejectComplaint(data: { id: string; formData: ComplaintFormSchema }) {
  return reviewComplaint(data, "REJECTED");
}
