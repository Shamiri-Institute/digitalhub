import AddStudentToGroup from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/add-student-to-group";
import AssignFellowSupervisorDialog from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/assign-fellow-supervisor-dialog";
import AttendanceHistory from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/attendance-history";
import { SchoolFellowTableData } from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/columns";
import FellowInfoContextProvider from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/fellow-info-context-provider";
import FellowsDatatable from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/fellows-datatable";
import StudentsInGroup from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/students-in-group";
import Loading from "#/app/(platform)/hc/schools/[visibleId]/loading";
import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { db } from "#/lib/db";
import { Suspense } from "react";

export default async function FellowsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const hc = await currentHubCoordinator();
  if (!hc) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }

  const school = await db.school.findFirstOrThrow({
    where: {
      visibleId,
    },
    include: {
      fellowAttendances: {
        include: {
          session: true,
          group: true,
        },
      },
    },
  });

  const fellows = db.$queryRaw<SchoolFellowTableData[]>`
      SELECT
        f.id, 
        f.fellow_name as "fellowName", 
        f.cell_number as "cellNumber", 
        f.supervisor_id as "supervisorId",
        sup.supervisor_name as "supervisorName", 
        f.dropped_out as "droppedOut", 
        ig.group_name as "groupName",
        ig.id as "groupId",
        (AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating))/4 AS "averageRating"
      FROM fellows f
      LEFT JOIN weekly_fellow_ratings wfr ON f.id = wfr.fellow_id
      LEFT JOIN supervisors sup ON f.supervisor_id = sup.id
      LEFT JOIN 
        (SELECT _ig.* FROM intervention_groups _ig WHERE _ig.school_id = ${school.id}) ig 
        ON f.id = ig.leader_id
      WHERE f.hub_id = ${school.hubId}
      GROUP BY f.id, ig.id, ig.group_name, sup.supervisor_name
  `;

  const supervisors = await db.supervisor.findMany({
    where: {
      hubId: hc?.assignedHubId as string,
    },
  });

  return (
    <FellowInfoContextProvider>
      <Suspense fallback={<Loading />}>
        <FellowsDatatable fellows={fellows} supervisors={supervisors} />
      </Suspense>
      <StudentsInGroup />
      <AddStudentToGroup />
      <AttendanceHistory attendances={school.fellowAttendances} />
      <AssignFellowSupervisorDialog supervisors={supervisors} />
    </FellowInfoContextProvider>
  );
}
