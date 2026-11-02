import MainSupervisorsDataTable from "#/app/(platform)/hc/supervisors/components/main-supervisors-datatable";
import { db } from "#/db/client";
import type { ImplementerRole } from "#/db/enums";

export default async function SupervisorsTable({
  hubId,
  projectId,
  role,
  title,
  description,
}: {
  hubId: string;
  projectId: string | null;
  role: ImplementerRole;
  title?: string;
  description?: string;
}) {
  const [supervisors, project] = await Promise.all([
    db.query.supervisor.findMany({
      where: (s, { eq }) => eq(s.hubId, hubId),
      with: {
        assignedSchools: {
          columns: { schoolName: true },
          orderBy: (school, { asc }) => [asc(school.schoolName), asc(school.id)],
        },
        fellows: { columns: { droppedOut: true } },
        monthlySupervisorEvaluation: true,
      },
      orderBy: (s, { asc }) => asc(s.supervisorName),
    }),
    projectId
      ? db.query.project.findFirst({
          where: (p, { eq }) => eq(p.id, projectId),
          columns: { actualStartDate: true, actualEndDate: true },
        })
      : undefined,
  ]);

  return (
    <MainSupervisorsDataTable
      supervisors={supervisors}
      project={project ?? null}
      role={role}
      title={title}
      description={description}
    />
  );
}
