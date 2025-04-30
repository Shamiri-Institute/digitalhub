"use server";
import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ComplaintSchema } from "./schema";

export async function recordStudentComplaint(
  data: z.infer<typeof ComplaintSchema>,
) {
  const complaint = ComplaintSchema.safeParse(data);

  if (!complaint.success) {
    return { success: false, message: "Invalid data submitted" };
  }

  const signedInSupervisor = await currentSupervisor();

  if (!signedInSupervisor) {
    return {
      success: false,
      message: "The current user is not logged in as a supervisor",
    };
  }

  let success = false;
  try {
    await db.studentReportingNotes.create({
      data: {
        supervisorId: signedInSupervisor?.id,
        notes: complaint.data.complaint,
        studentId: complaint.data.studentId,
      },
    });
    success = true;
  } catch (e) {
    console.error(e);
    return { success: false };
  }

  if (success) {
    revalidatePath(
      `/schools/${complaint.data.schoolId}/students?fellowId=${complaint.data.fellowId}`,
    );
  }
  
  return { success: true };
}
