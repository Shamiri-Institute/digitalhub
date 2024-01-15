"use client"
import CreateClinicalCaseDialogue from "#/app/(platform)/screenings/[caseId]/components/create-clinical-case";
import { Icons } from "#/components/icons";
import { Separator } from "#/components/ui/separator";
import { Fellow, School, Student, Supervisor } from "@prisma/client";

type FellowWithStudents = Fellow & {
    students: Student[]
}


type SupervisorWithFellows = Supervisor & {
    fellows: FellowWithStudents[]
}

type SchoolsWithSupervisors = School & {
    supervisors: SupervisorWithFellows[]
}

export function CreateClinicalCases({
    currentSupervisorId,
    schools
}: {
    currentSupervisorId: string | undefined
    schools: SchoolsWithSupervisors[]
}) {
    return (
        <div className="my-3">
            <div className="my-4 flex justify-between">
                <h3 className="text-base font-semibold text-brand xl:text-2xl">
                    My Clinical Cases
                </h3>

                <div className="flex">
                    <Icons.vshapedHumberger className="mr-6 h-6 w-6 text-brand" />
                    <CreateClinicalCaseDialogue currentSupervisorId={currentSupervisorId} schools={schools}>
                        <Icons.add className="h-6 w-6 text-brand" />
                    </CreateClinicalCaseDialogue>
                </div>
            </div>
            <Separator />
        </div>
    );
}
