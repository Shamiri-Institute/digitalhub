import {
  fetchFellowsWithRatings,
  fetchSchoolFellowAttendances,
} from "#/app/(platform)/hc/schools/[visibleId]/fellows/actions";
import AddStudentToGroup from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/add-student-to-group";
import AttendanceHistory from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/attendance-history";
import FellowInfoContextProvider from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/fellow-info-context-provider";
import FellowsDatatable from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/fellows-datatable";
import StudentsInGroup from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/students-in-group";
import { fetchHubSupervisors } from "#/app/(platform)/hc/schools/actions";
import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";

export default async function FellowsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const hc = await currentHubCoordinator();
  if (!hc) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }
  const fellows = await fetchFellowsWithRatings(visibleId);
  const attendances = await fetchSchoolFellowAttendances(visibleId);
  const supervisors = await fetchHubSupervisors({
    where: {
      hubId: hc?.assignedHubId as string,
    },
  });

  return (
    <FellowInfoContextProvider>
      <FellowsDatatable fellows={fellows} supervisors={supervisors} />
      <StudentsInGroup />
      <AddStudentToGroup />
      <AttendanceHistory attendances={attendances} />
    </FellowInfoContextProvider>
  );
}
