import { MySchool } from "#/app/(platform)/profile/myschool/my-school";
import { currentSupervisor } from "#/app/auth";


export default async function MySchoolPage() {
    const supervisor = await currentSupervisor();
    const assignedSchool = supervisor.assignedSchool;

    if (assignedSchool?.droppedOut) {
        return (
            <div><strong>{assignedSchool?.schoolName}</strong> has dropped out. <strong>{assignedSchool.dropoutReason}</strong></div>
        )
    }

    return (
        <MySchool school={assignedSchool} />
    )
}
