"use server";

import { ImplementerRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentPersonnel } from "#/app/auth";
import { db } from "#/lib/db";

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

export type LoadFellowComplaintsOptions =
  | { scope: "supervisor"; supervisorId: string }
  | { scope: "hub"; hubId: string }
  | { scope?: "all" };

export async function loadFellowComplaints(options?: LoadFellowComplaintsOptions) {
  try {
    const where =
      options?.scope === "supervisor"
        ? { fellow: { supervisorId: options.supervisorId } }
        : options?.scope === "hub"
          ? { fellow: { hubId: options.hubId } }
          : undefined;

    const fellowComplaints = await db.fellowComplaints.findMany({
      where,
      include: {
        supervisor: true,
        fellow: {
          include: {
            supervisor: true,
          },
        },
      },
    });

    const groupedByFellow = fellowComplaints.reduce<
      Record<string, FellowComplaintsGroupedByFellow>
    >((acc, item) => {
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
    }, {});

    return Object.values(groupedByFellow);
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function editFellowComplaint(complaintId: string, complaint: string) {
  try {
    const user = await getCurrentPersonnel();
    if (user && user?.session?.user.activeMembership?.role !== ImplementerRole.HUB_COORDINATOR) {
      return {
        success: false,
        message: "You are not authorized to perform this action",
      };
    }

    await db.fellowComplaints.update({
      where: { id: complaintId },
      data: { complaint },
    });

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
