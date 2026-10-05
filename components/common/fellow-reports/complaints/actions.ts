"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fellowComplaints } from "#/db/schema";
import { fellowsInCallerScope, requireHubRole } from "#/lib/auth/require-hub-role";

export type FellowComplaintsType = Awaited<ReturnType<typeof loadFellowComplaints>>[number];

type FellowComplaintsGroupedByFellow = {
  id: string;
  fellowName: string;
  supervisorName: string;
  complaints: {
    complaintId: string;
    date: string;
    complaint: string;
    additionalComments: string;
    fellowName: string;
  }[];
};

/** Complaints about the fellows the caller supervises, or about their hub's fellows. */
export async function loadFellowComplaints() {
  const caller = await requireHubRole(ImplementerRole.SUPERVISOR, ImplementerRole.HUB_COORDINATOR);
  try {
    const complaints = await db.query.fellowComplaints.findMany({
      where: (c, { inArray }) => inArray(c.fellowId, fellowsInCallerScope(caller)),
      with: {
        supervisor: true,
        fellow: { with: { supervisor: true } },
      },
      orderBy: (c, { asc }) => [asc(c.createdAt), asc(c.id)],
    });

    const groupedByFellow = complaints.reduce<Record<string, FellowComplaintsGroupedByFellow>>(
      (acc, item) => {
        const fellowId = item.fellowId;
        const supervisorName =
          item.fellow.supervisor?.supervisorName ?? item.supervisor?.supervisorName ?? "";

        if (!acc[fellowId]) {
          acc[fellowId] = {
            id: fellowId,
            fellowName: item.fellow.fellowName ?? "",
            supervisorName,
            complaints: [],
          };
        }

        const formattedDate = (() => {
          if (!item.createdAt) return new Date().toISOString().split("T")[0];
          const date = new Date(String(item.createdAt));
          return date.toISOString().split("T")[0];
        })();

        acc[fellowId].complaints.push({
          complaintId: item.id,
          date: formattedDate ?? "",
          complaint: item.complaint ?? "",
          additionalComments: item.comments ?? "",
          fellowName: item.fellow.fellowName ?? "",
        });
        return acc;
      },
      {},
    );

    return Object.values(groupedByFellow);
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function editFellowComplaint(complaintId: string, complaint: string) {
  try {
    const coordinator = await requireHubRole(ImplementerRole.HUB_COORDINATOR);

    // A complaint about a fellow outside the coordinator's scope reads as missing.
    const updated = await db
      .update(fellowComplaints)
      .set({ complaint })
      .where(
        and(
          eq(fellowComplaints.id, complaintId),
          inArray(fellowComplaints.fellowId, fellowsInCallerScope(coordinator)),
        ),
      )
      .returning({ id: fellowComplaints.id });
    if (updated.length === 0) {
      throw new Error(`Complaint ${complaintId} not found`);
    }

    revalidatePath("/hc/schools/fellow-reports/complaints");
    return {
      success: true,
      message: "Complaint updated successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      message: "Something went wrong",
      success: false,
    };
  }
}
