import { Prisma } from "@prisma/client";

import { db } from "#/lib/db";

export async function submitDelayedPaymentRequest(data: {
  fellowId: string;
  supervisorId: string;
  interventionSessionId: string;
  attendanceId: number;
}): Promise<
  | {
      success: true;
      delayedPaymentRequest: Prisma.DelayedPaymentRequestGetPayload<{}>;
    }
  | { success: false; error: string }
> {
  try {
    const delayedPaymentRequest = await db.delayedPaymentRequest.create({
      data: {
        fellowId: data.fellowId,
        supervisorId: data.supervisorId,
        interventionSessionId: data.interventionSessionId,
        fellowAttendanceId: data.attendanceId,
      },
    });

    return { success: true, delayedPaymentRequest };
  } catch (error: unknown) {
    console.error(error);
    return { success: false, error: "Something went wrong" };
  }
}
