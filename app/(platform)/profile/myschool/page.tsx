import { MySchool } from "#/app/(platform)/profile/myschool/my-school";
import { currentSupervisor } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { db } from "#/lib/db";

export default async function MySchoolPage({
  searchParams,
}: {
  searchParams: { sid?: string };
}) {
  const supervisor = await currentSupervisor();
  if (!supervisor) {
    return <InvalidPersonnelRole role="supervisor" />;
  }

  const assignedSchool = await db.school.findUnique({
    where: { visibleId: searchParams.sid, assignedSupervisorId: supervisor.id },
  });

  if (!assignedSchool) {
    return <div>No assigned school</div>;
  }

  if (assignedSchool?.droppedOut) {
    return (
      <div>
        <strong>{assignedSchool?.schoolName}</strong> has dropped out.{" "}
        <strong>{assignedSchool.dropoutReason}</strong>
      </div>
    );
  }

  return <MySchool school={assignedSchool} />;
}
