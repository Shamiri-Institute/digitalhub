import SessionsDatatable from "#/app/(platform)/hc/schools/[visibleId]/sessions/components/sessions-datatable";
import { db } from "#/lib/db";

export default async function SchoolSessionsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const sessions = await db.interventionSession.findMany({
    where: {
      school: {
        visibleId,
      },
    },
    include: {
      school: {
        include: {
          assignedSupervisor: true,
        },
      },
      sessionRatings: true,
    },
  });

  return <SessionsDatatable sessions={sessions} />;
}
