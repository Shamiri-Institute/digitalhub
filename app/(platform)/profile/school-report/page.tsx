import Link from "next/link";
import { z } from "zod";

import { Icons } from "#/components/icons";
import { db } from "#/lib/db";
import { currentSupervisor } from "#/app/auth";
import { SchoolReportCard } from "./school-report-card";
import { addWeeks } from "date-fns";

export interface SessionItem {
    sessionName: string
    sessionType: string
    sessionDate: Date
}

let sessionItems: SessionItem[] = [
    { sessionName: "Pre session", sessionType: "s0", sessionDate: addWeeks(new Date(), 0) },
    { sessionName: "Session 01", sessionType: "s1", sessionDate: addWeeks(new Date(), 1) },
    { sessionName: "Session 02", sessionType: "s2", sessionDate: addWeeks(new Date(), 2) },
    { sessionName: "Session 03", sessionType: "s3", sessionDate: addWeeks(new Date(), 3) },
    { sessionName: "Session 04", sessionType: "s4", sessionDate: addWeeks(new Date(), 4) },
    { sessionName: "Follow-up 01", sessionType: "fu1", sessionDate: addWeeks(new Date(), 5) },
    { sessionName: "Follow-up 02", sessionType: "fu2", sessionDate: addWeeks(new Date(), 6) },
    { sessionName: "Follow-up 03", sessionType: "fu3", sessionDate: addWeeks(new Date(), 7) },
    { sessionName: "Follow-up 04", sessionType: "fu4", sessionDate: addWeeks(new Date(), 8) },
    { sessionName: "Follow-up 05", sessionType: "fu5", sessionDate: addWeeks(new Date(), 9) },
    { sessionName: "Follow-up 06", sessionType: "fu6", sessionDate: addWeeks(new Date(), 10) },
    { sessionName: "Follow-up 07", sessionType: "fu7", sessionDate: addWeeks(new Date(), 11) },
    { sessionName: "Follow-up 08", sessionType: "fu8", sessionDate: addWeeks(new Date(), 12) },
];

export default async function SchoolReport() {
    const { assignedSchoolId } = await currentSupervisor();

    if (assignedSchoolId === null) {
        throw Error("Supervisor has no assigned school")
    }

    const interventionSessions: {
        session: (SessionItem & { occurred: boolean }) | null,
        defaultSessionValues: Pick<SessionItem, 'sessionName' | 'sessionDate' | 'sessionType'>
    }[] = await Promise.all(sessionItems.map(async (sessionItem) => {
        let created = false

        const interventionSession = await db.interventionSession.findUnique({
            where: {
                findInterventionBySchoolAndSessionType: {
                    sessionType: sessionItem.sessionType,
                    schoolId: assignedSchoolId,
                },
            }
        })
        if (interventionSession) {
            created = true
            return {
                session: {
                    occurred: interventionSession.occurred,
                    sessionName: interventionSession.sessionName,
                    sessionType: interventionSession.sessionType,
                    sessionDate: interventionSession.sessionDate
                },
                defaultSessionValues: {
                    sessionName: sessionItem.sessionName,
                    sessionType: sessionItem.sessionType,
                    sessionDate: sessionItem.sessionDate,
                }
            }
        }

        return {
            session: null,
            defaultSessionValues: {
                sessionName: sessionItem.sessionName,
                sessionType: sessionItem.sessionType,
                sessionDate: sessionItem.sessionDate,
            }
        }
    }))

    return (
        <div>
            <IntroHeader />
            {interventionSessions.map(({ session, defaultSessionValues }) => (
                <SchoolReportCard
                    key={session?.sessionName ?? defaultSessionValues.sessionName}
                    name={session?.sessionName ?? defaultSessionValues.sessionName}
                    occurring={session?.occurred || false}
                    payload={{
                        occurred: !(session?.occurred || false),
                        sessionName: session?.sessionName ?? defaultSessionValues.sessionName,
                        sessionDate: defaultSessionValues.sessionDate,
                        sessionType: defaultSessionValues.sessionType,
                        yearOfImplementation: session?.sessionDate.getFullYear() || new Date().getFullYear(),
                        schoolId: assignedSchoolId
                    }}
                />
            ))}
        </div>
    );
}

async function IntroHeader() {
    const { assignedSchool } = await currentSupervisor();

    return (
        <div>
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
        </div>
    );
}


