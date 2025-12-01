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

export async function loadFellowComplaints() {
  try {
    const fellowComplaints = await db.fellowComplaints.findMany({
      include: {
        supervisor: true,
        fellow: true,
      },
    });

    const groupedByFellow = fellowComplaints.reduce<
      Record<string, FellowComplaintsGroupedByFellow>
    >((acc, item) => {
      const fellowId = item.fellowId;

      if (!acc[fellowId]) {
        acc[fellowId] = {
          id: fellowId,
          fellowName: item.fellow.fellowName ?? "",
          supervisorName: item.supervisor?.supervisorName ?? "",
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
