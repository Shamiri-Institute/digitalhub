import Link from "next/link";
import { z } from "zod";

import { Icons } from "#/components/icons";
import { SchoolReportCard } from "./school-report-card";
import { db } from "#/lib/db";
import { currentSupervisor } from "#/app/auth";

export const FormSchema = z.object({
    dateOfSession: z.date({
        required_error: "Please enter the fellow's date of session.",
    }),
});

interface SessionItem {
    displayName: string
    sessionType: string
}

let sessionItems: SessionItem[] = [
    { displayName: "Pre session", sessionType: "s0" },
    { displayName: "Session 01", sessionType: "s1" },
    { displayName: "Session 02", sessionType: "s2" },
    { displayName: "Session 03", sessionType: "s3" },
    { displayName: "Session 04", sessionType: "s4" },
    { displayName: "Follow-up 01", sessionType: "fu1" },
    { displayName: "Follow-up 02", sessionType: "fu2" },
    { displayName: "Follow-up 03", sessionType: "fu3" },
    { displayName: "Follow-up 04", sessionType: "fu4" },
    { displayName: "Follow-up 05", sessionType: "fu5" },
    { displayName: "Follow-up 06", sessionType: "fu6" },
    { displayName: "Follow-up 07", sessionType: "fu7" },
    { displayName: "Follow-up 08", sessionType: "fu8" },
];

export default async function SchoolReport() {
    const { assignedSchoolId } = await currentSupervisor();

    if (assignedSchoolId === null) {
        throw Error("Supervisor has no assigned school")
    }


    const interventionSessions: { session: SessionItem | null, defaultName: string }[] = await Promise.all(sessionItems.map(async (sessionItem) => {
        let created = false

        const interventionSession = await db.interventionSession.findFirst({ // TODO: add unique index and move to findUnique
            where: {
                sessionType: sessionItem.sessionType,
                schoolId: assignedSchoolId,
            }
        })
        if (interventionSession) {
            created = true
            return {
                session: {
                    displayName: interventionSession.sessionName,
                    sessionType: interventionSession.sessionType,
                },
                defaultName: sessionItem.displayName
            }
        }

        return {
            session: null,
            defaultName: sessionItem.displayName
        }
    }))

    return (
        <div>
            <IntroHeader />
            {interventionSessions.map(({ session, defaultName }) => (
                <SchoolReportCard name={session?.displayName ?? defaultName} attended={session !== null} />
            ))}
        </div>
    );
}

export async function IntroHeader() {
    const { assignedSchool } = await currentSupervisor();

    return (
        <>
            <div className="mt-2 flex items-center justify-between ">
                <Link href="/profile">
                    <button>
                        <Icons.chevronLeft className="h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
                    </button>
                </Link>
                <h3 className="text-xl font-bold text-brand">My School Report</h3>
                {/* <button>
                    <Icons.add className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-shamiri-blue' />
                </button> */}
                <div></div>
            </div>
            <h4 className="text-brand-light-gray text-center text-xs">
                {assignedSchool?.schoolName}
            </h4>
        </>
    );
}


