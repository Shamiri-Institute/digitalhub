import { SchoolCard } from '#/app/(platform)/schools/page'
import { currentHub } from '#/app/auth';
import { Icons } from '#/components/icons'
import { db } from '#/lib/db';
import React from 'react'


const sessionTypes = ["Pre", "S1", "S2", "S3", "S4"];

export default function SupervisorProfile() {
    return (
        <>
            <IntroHeader />
            <ProfileHeader />
            <MySchools />
            <MyFellows />
        </>
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

function ProfileHeader() {
    return (
        <div className='flex flex-col justify-center items-center mt-10 border-b '>
            <div className='h-32 w-32 bg-gray-400 rounded-full my-4'>
                {/* todo: image goes here ?? */}
            </div>
            <p className='text-base font-semibold text-shamiri-blue-darker xl:text-2xl pl-3'>
                Supervisor Name
            </p>

            <div className='flex my-4'>
                <div className='pr-4'>
                    <p className='text-base font-semibold text-shamiri-blue'>09</p>
                    <p className='text-xs text-brand'>Fellows</p>
                </div>
                <div className=' border-l border-border/50 pl-4'>
                    <p className='text-base font-semibold text-shamiri-blue'>05</p>
                    <p className='text-xs text-brand'>Schools</p>
                </div>
                <div className=' border-l border-border/50 pl-4'>
                    <p className='text-base font-semibold text-shamiri-blue'>2000</p>
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

                <SchoolCard
                    key={assignedSchool.schoolName}
                    school={assignedSchool}
                    sessionTypes={sessionTypes}
                    assigned
                />
                {/* {otherSchools.map((school) => (
                    <SchoolCard
                        key={school.schoolName}
                        school={school}
                        sessionTypes={sessionTypes}
                    />
                ))} */}
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
                {/* todo: change to fellow card */}
                <SchoolCard
                    key={assignedSchool.schoolName}
                    school={assignedSchool}
                    sessionTypes={sessionTypes}

                />
                <SchoolCard
                    key={assignedSchool.schoolName}
                    school={assignedSchool}
                    sessionTypes={sessionTypes}

                />
                <SchoolCard
                    key={assignedSchool.schoolName}
                    school={assignedSchool}
                    sessionTypes={sessionTypes}

                />
            </div>
        </>
    )
}



