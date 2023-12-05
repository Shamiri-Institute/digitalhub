import { MySchool } from "#/app/(platform)/profile/myschool/my-school";
import { currentSupervisor } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";

export default async function MySchoolPage() {
  const supervisor = await currentSupervisor();
  if (!supervisor) {
    return <InvalidPersonnelRole role="supervisor" />;
  }

  const assignedSchool = supervisor.assignedSchool;

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
