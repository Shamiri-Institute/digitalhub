"use server";

import { Prisma } from "@prisma/client";

import { db } from "#/lib/db";

export async function fetchRepaymentRequest({
  where,
}: {
  where: Prisma.RepaymentRequestWhereInput;
}) {
  const repaymentRequests = await db.repaymentRequest.findMany({
    where,
    include: {
      fellowAttendance: {
        include: {
          session: true,
          school: true,
        },
      },
    },
  });

  return repaymentRequests;
}
