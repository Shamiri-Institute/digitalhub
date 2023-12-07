'use server'
import { z } from 'zod';
import { db } from '#/lib/db';
import { currentSupervisor } from '#/app/auth';
import { revalidatePath } from 'next/cache';

export const ComplaintSchema = z.object({
  complaint: z.string(),
  studentId: z.string(),
  schoolId: z.string(),
  fellowId: z.string(),
});

export async function recordStudentComplaint(data: z.infer<typeof ComplaintSchema>) {
  const complaint = ComplaintSchema.safeParse(data);

  if (!complaint.success) {
    return;
  }

  const signedInSupervisor = await currentSupervisor()

  if (!signedInSupervisor) {
    return;
  }

  try {
    const newComplaint = await db.studentComplaints.create({
      data: {
        supervisorId: signedInSupervisor?.id,
        complaint: complaint.data.complaint,
        studentId: complaint.data.studentId,
      }
    })

    revalidatePath(`/schools/${complaint.data.schoolId}/students?fellowId=${complaint.data.fellowId}`);
    return { success: true }
  } catch (e) {
    return { success: false }
  }
}
