import { db } from "#/lib/db";

export type HubScheduleStats = {
  sessionCount: number;
  clinicalCaseCount: number;
  fellowCount: number;
};

export async function getHubScheduleStats(hubId: string): Promise<HubScheduleStats> {
  const [sessionCount, clinicalCaseCount, fellowCount] = await Promise.all([
    db.interventionSession.count({
      where: { school: { hubId } },
    }),
    db.clinicalScreeningInfo.count({
      where: { student: { school: { hubId } } },
    }),
    db.fellow.count({
      where: { hubId },
    }),
  ]);

  return { sessionCount, clinicalCaseCount, fellowCount };
}
