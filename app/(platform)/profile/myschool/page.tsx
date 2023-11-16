import { MySchool } from "#/app/(platform)/profile/myschool/my-school";
import { currentSupervisor } from "#/app/auth";


export default async function MySchoolPage() {
    const supervisor = await currentSupervisor();
    const assignedSchool = supervisor.assignedSchool;

    if (assignedSchool?.droppedOut) {
        return (
            <div>{assignedSchool?.schoolName} has dropped out. {assignedSchool.dropoutReason}</div>
        )
    }

    return (
        <MySchool school={assignedSchool} />
    )
}
