import { db } from "#/lib/db";

export async function getFellowGroupsAndHubData(fellowId: string) {
  return db.fellow.findFirst({
    where: { id: fellowId },
    include: {
      groups: {
        include: {
          _count: { select: { students: true } },
          school: {
            include: {
              _count: { select: { interventionSessions: true } },
            },
          },
        },
      },
      hub: {
        include: {
          schools: {
            include: {
              assignedSupervisor: true,
              interventionSessions: {
                include: {
                  sessionRatings: true,
                  session: true,
                },
              },
              students: {
                include: {
                  assignedGroup: true,
                  _count: { select: { clinicalCases: true } },
                },
              },
            },
          },
          sessions: true,
        },
      },
    },
  });
}
