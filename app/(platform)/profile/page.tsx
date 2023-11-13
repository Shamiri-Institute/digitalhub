import * as React from 'react'
import Link from "next/link";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "#/components/ui/accordion";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { cn, getInitials } from "#/lib/utils";
import { SchoolCardProfile } from "#/app/(platform)/profile/components/school-card";
import { SchoolCard } from "../schools/school-card";
import { currentHub, currentSupervisor } from '#/app/auth';
import { Icons } from '#/components/icons'
import { db } from '#/lib/db';


const sessionTypes = ["Pre", "S1", "S2", "S3", "S4"];


const fellowDetails = [{
    id: "FE_001",
    name: "Jean Kasudi",
    gender: "Female",
    cell_number: "0790-000-100",
    mpesa_number: "0792000000",
    hub: "Nairobi",
    county: "Nairobi",
    age: 18,
    sessions_attended: 7
},
{
    id: "FE_003",

    name: "Faith Mwende",
    gender: "Female",
    cell_number: "0790-000-100",
    mpesa_number: "0792000000",
    hub: "Nairobi",
    county: "Nairobi",
    age: 23,
    sessions_attended: 16
},
{
    id: "FE_005",

    name: "Innocent Kilonzo",
    gender: "Male",
    cell_number: "0790-000-100",
    mpesa_number: "0792000000",
    hub: "Nairobi",
    county: "Nairobi",
    age: 25,
    sessions_attended: 12
},
{
    id: "FE_006",

    name: "Marcus Ikenye",
    gender: "Male",
    cell_number: "0790-000-100",
    mpesa_number: "0792000000",
    hub: "Nairobi",
    county: "Nairobi",
    age: 20,
    sessions_attended: 10
},
{
    id: "FE_007",

    name: "Flavour Otieno",
    gender: "Male",
    cell_number: "0790-000-100",
    mpesa_number: "0792000000",
    hub: "Nairobi",
    county: "Nairobi",
    age: 18,
    sessions_attended: 18
},
]


export default async function SupervisorProfile() {
    let supervisor = await currentSupervisor()


    const fellowsCount = (
        await db.fellowAttendance.groupBy({
            by: ["fellowId"],
            where: {
                supervisorId: supervisor.id,
                schoolId: supervisor.assignedSchoolId ?? undefined,
            },
            _sum: {
                id: true,
            },
        })
    ).length;

    // SELECT COUNT(*) FROM schools WHERE hub_id = 'hub_01hetrj9mhf8kbq9tcm3eyg66v';


    const schoolCount = await db.school.count({
        where: {
            hubId: supervisor.hubId
        }
    }
    )

    // STUDENT COUNT

    // SELECT * FROM fellows WHERE supervisor_id = current_supervisor_id INNER JOIN students ON fellows.id = students.fellow_id

    // SELECT fellows.fellow_name, students.student_name FROM fellows INNER JOIN students ON fellows.id = students.fellow_id WHERE fellows.supervisor_id = 'sup_01hetrjb41f80a5hee3430bh79';

    const studentCount = (await db.fellow.findMany({
        where: {
            supervisorId: supervisor.id
        },
        include: {
            students: true
        }
    })).map(fellow => fellow.students.length).reduce((a, b) => a + b, 0);
    console.debug({ studentCount })

    let supervisorName = supervisor.supervisorName ?? "N/A"

    // console.log({ supervisor, fellowsCount, schoolCount })


    return (
        <main>
            <IntroHeader />
            <ProfileHeader fellowsCount={fellowsCount} schoolCount={schoolCount} supervisorName={supervisorName} studentCount={studentCount} />
            <MySchools />
            <MyFellows />
        </main>
    )
}


function IntroHeader() {
    return (
        <div className='flex justify-between items-center  mt-2'>
            <div className='flex items-center'>
                <Icons.user className="h-5 w-5 align-baseline xl:h-7 xl:w-7 text-brand" />
                <h3 className="text-base font-semibold text-brand xl:text-2xl pl-3">
                    Profile
                </h3>
            </div>
            <Icons.search className="h-5 w-5 align-baseline text-brand" />
        </div>
    )
}


function ProfileHeader({ fellowsCount, schoolCount, supervisorName, studentCount }: { fellowsCount: number, schoolCount: number, supervisorName: string, studentCount: number }) {
    return (
        <div className='flex flex-col justify-center items-center mt-10 border-b '>
            <div className='h-32 w-32 bg-gray-400 rounded-full my-4 flex justify-center items-center'>
                <h3 className="text-4xl text-shamiri-blue font-semibold text-center self-center">
                    {getInitials(supervisorName)}
                </h3>
            </div>
            <p className='text-base font-semibold text-shamiri-blue-darker xl:text-2xl pl-3'>
                {supervisorName}
            </p>
            <div className='flex my-4'>
                <div className='pr-4'>
                    <p className='text-base font-semibold text-shamiri-blue'>{fellowsCount.toString().padStart(2, "0")}</p>
                    <p className='text-xs text-brand'>Fellows</p>
                </div>
                <div className=' border-l border-border/50 pl-4'>
                    <p className='text-base font-semibold text-shamiri-blue'>{schoolCount.toString().padStart(2, "0")}</p>
                    <p className='text-xs text-brand'>Schools</p>
                </div>
                <div className=' border-l border-border/50 pl-4'>
                    <p className='text-base font-semibold text-shamiri-blue'>{studentCount.toString().padStart(2, "0")}</p>
                    <p className='text-xs text-brand'>Students</p>
                </div>
            </div>
        </div>
    )
}

async function MySchools() {
    const hub = await currentHub();
    const assignedSchoolId = "ANS23_School_17";
    const assignedSchool = await db.school.findFirst({
        where: { visibleId: assignedSchoolId, hubId: hub!.id },
    });
    if (!assignedSchool) {
        throw new Error("Assigned school not found");
    }

    const otherSchools = await db.school.findMany({
        where: { visibleId: { not: assignedSchoolId }, hubId: hub!.id },
    });

    return (
        <>

            <div className="grid grid-cols-1 gap-4 sm:gap-6  sm:items-center">
                <h3 className='text-base font-semibold text-brand xl:text-2xl mt-4'>
                    My School
                </h3>
                <SchoolCardProfile
                    key={assignedSchool.schoolName}
                    school={assignedSchool}
                    sessionTypes={sessionTypes}
                    assigned
                />

            </div>
        </>
    )
}

async function MyFellows() {
    const hub = await currentHub();
    const assignedSchoolId = "ANS23_School_17";
    const assignedSchool = await db.school.findFirst({
        where: { visibleId: assignedSchoolId, hubId: hub!.id },
    });
    if (!assignedSchool) {
        throw new Error("Assigned school not found");
    }

    return (
        <>
            <div className='flex justify-between items-center mt-5'>
                <h3 className='text-base font-semibold text-brand xl:text-2xl'>
                    My Fellows
                </h3>
                <button>
                    <Icons.add className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-brand' />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2  xl:grid-cols-3 sm:items-center mt-6">
                {
                    fellowDetails.map((fellow) => (
                        <MyFellowCard
                            key={fellow.name}
                            fellow={fellow}
                        />
                    ))
                }
            </div>
        </>
    )
}





function MyFellowCard({
    fellow,
    assigned,
}: {
    fellow: any;
    assigned?: boolean;
}) {
    return (
        <Card
            className={cn("mb-4 flex flex-col gap-5 p-5 pr-3.5", {
                "bg-white": !assigned,
                "bg-brand": assigned,
            })}
        >
            <div
                className={cn(
                    "flex items-center justify-between gap-4 border-b border-border/50 pb-3 pr-3",
                    "grid grid-cols-[15fr,10fr]",
                    {
                        "border-border/20": assigned,
                    },
                )}
            >
                <div>


                    <h3
                        className={cn("font-semibold xl:text-xl text-brand")}
                    >
                        {fellow.name}
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground xl:text-lg">
                        Shamiri ID: 123456

                    </p>
                </div>
                <div
                    className={cn(
                        "flex items-start justify-end  pl-4",


                    )}
                >
                    <Link
                        href={`#`}
                        className="flex flex-col gap-[1px]"
                    >

                        <div>
                            <Icons.moreHorizontal className="h-5 w-5 text-brand" />

                        </div>

                    </Link>

                </div>
            </div>

            <div className="flex flex-col ">
                <div className="flex justify-between">

                    <div className="flex flex-col ">

                        <div className="flex justify-start gap-2">
                            <p className="text-base font-medium text-muted-foreground xl:text-lg">
                                Age:
                            </p>
                            <p className="text-base font-semibold xl:text-lg text-brand">
                                {fellow.age}
                            </p>
                        </div>
                        <div className="flex justify-start gap-2">
                            <p className="text-base font-medium text-muted-foreground xl:text-lg">
                                Gender:
                            </p>
                            <p className="text-base font-semibold xl:text-lg text-brand">
                                {fellow.gender}
                            </p>
                        </div>
                        <div className="flex justify-start gap-2">
                            <p className="text-base font-medium text-muted-foreground xl:text-lg">
                                Contact:
                            </p>
                            <p className="text-base font-semibold xl:text-lg text-brand">
                                {fellow.cell_number}
                            </p>
                        </div>
                        <div className="flex justify-start gap-2">
                            <p className="text-base font-medium text-muted-foreground xl:text-lg">
                                Mpesa:
                            </p>
                            <p className="text-base font-semibold xl:text-lg text-brand">
                                {fellow.mpesa_number}
                            </p>
                        </div>
                        <div className="flex justify-start gap-2">
                            <p className="text-base font-medium text-muted-foreground xl:text-lg">
                                Hub:
                            </p>
                            <p className="text-base font-semibold xl:text-lg text-brand">
                                {fellow.hub}
                            </p>
                        </div>
                        <div className="flex justify-start gap-2">
                            <p className="text-base font-medium text-muted-foreground xl:text-lg">
                                County:
                            </p>
                            <p className="text-base font-semibold xl:text-lg text-brand">
                                {fellow.county}
                            </p>
                        </div>

                    </div>


                    <div
                        className="flex flex-col items-end justify-end"
                    >
                        <h2 className="text-5xl text-shamiri-blue font-semibold text-right self-end">18</h2>
                        <p className="text-xs font-medium text-brand text-right">Sessions attended</p>
                    </div>
                </div>
                <Button className="w-full mt-4 bg-shamiri-blue hover:bg-brand">Schools</Button>

            </div>

        </Card>
    );
}