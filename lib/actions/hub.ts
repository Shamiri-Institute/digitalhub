import { eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { clinicalScreeningInfo, fellow, interventionSession, school, student } from "#/db/schema";

export type HubScheduleStats = {
  sessionCount: number;
  clinicalCaseCount: number;
  fellowCount: number;
};

export async function getHubScheduleStats(hubId: string): Promise<HubScheduleStats> {
  const hubSchoolIds = db.select({ id: school.id }).from(school).where(eq(school.hubId, hubId));
  const [sessionCount, clinicalCaseCount, fellowCount] = await Promise.all([
    db.$count(interventionSession, inArray(interventionSession.schoolId, hubSchoolIds)),
    db.$count(
      clinicalScreeningInfo,
      inArray(
        clinicalScreeningInfo.studentId,
        db.select({ id: student.id }).from(student).where(inArray(student.schoolId, hubSchoolIds)),
      ),
    ),
    db.$count(fellow, eq(fellow.hubId, hubId)),
  ]);

  return { sessionCount, clinicalCaseCount, fellowCount };
}
