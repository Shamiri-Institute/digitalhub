import Link from "next/link";

import { currentSupervisor } from "#/app/auth";
import { Icons } from "#/components/icons";
import { db } from "#/lib/db";
import { addWeeks } from "date-fns";
import { SchoolReportCard } from "./school-report-card";

export interface SessionItem {
  id: string;
  sessionName: string;
  sessionType: string;
  sessionDate: Date;
}

const referenceDate = new Date();
referenceDate.setHours(14);
referenceDate.setMinutes(0);

let referenceSessionItems: Omit<SessionItem, "id">[] = [
  {
    sessionName: "Pre session",
    sessionType: "s0",
    sessionDate: addWeeks(referenceDate, 0),
  },
  {
    sessionName: "Session 01",
    sessionType: "s1",
    sessionDate: addWeeks(referenceDate, 1),
  },
  {
    sessionName: "Session 02",
    sessionType: "s2",
    sessionDate: addWeeks(referenceDate, 2),
  },
  {
    sessionName: "Session 03",
    sessionType: "s3",
    sessionDate: addWeeks(referenceDate, 3),
  },
  {
    sessionName: "Session 04",
    sessionType: "s4",
    sessionDate: addWeeks(referenceDate, 4),
  },
  {
    sessionName: "Data Collection Follow-up 01",
    sessionType: "dcfu1",
    sessionDate: addWeeks(referenceDate, 5),
  },
  {
    sessionName: "Clinical Follow-up 01",
    sessionType: "cfu1",
    sessionDate: addWeeks(referenceDate, 5),
  },
  {
    sessionName: "Clinical Follow-up 02",
    sessionType: "cfu2",
    sessionDate: addWeeks(referenceDate, 6),
  },
  {
    sessionName: "Clinical Follow-up 03",
    sessionType: "cfu3",
    sessionDate: addWeeks(referenceDate, 7),
  },
  {
    sessionName: "Clinical Follow-up 04",
    sessionType: "cfu4",
    sessionDate: addWeeks(referenceDate, 8),
  },
  {
    sessionName: "Clinical Follow-up 05",
    sessionType: "cfu5",
    sessionDate: addWeeks(referenceDate, 9),
  },
  {
    sessionName: "Clinical Follow-up 06",
    sessionType: "cfu6",
    sessionDate: addWeeks(referenceDate, 10),
  },
  {
    sessionName: "Clinical Follow-up 07",
    sessionType: "cfu7",
    sessionDate: addWeeks(referenceDate, 11),
  },
  {
    sessionName: "Clinical Follow-up 08",
    sessionType: "cfu8",
    sessionDate: addWeeks(referenceDate, 12),
  },
];

export default async function SchoolReport() {
  const { assignedSchoolId } = await currentSupervisor();

  if (assignedSchoolId === null) {
    throw Error("Supervisor has no assigned school");
  }

  const interventionSessions: {
    session: (SessionItem & { occurred: boolean }) | null;
    defaultSessionValues: Pick<
      SessionItem,
      "sessionName" | "sessionDate" | "sessionType"
    >;
  }[] = await Promise.all(
    referenceSessionItems.map(async (sessionItem) => {
      let created = false;

      const interventionSession = await db.interventionSession.findUnique({
        where: {
          interventionBySchoolIdAndSessionType: {
            sessionType: sessionItem.sessionType,
            schoolId: assignedSchoolId,
          },
        },
      });
      if (interventionSession) {
        created = true;
        return {
          session: {
            id: interventionSession.id,
            occurred: interventionSession.occurred,
            sessionName: interventionSession.sessionName,
            sessionType: interventionSession.sessionType,
            sessionDate: interventionSession.sessionDate,
          },
          defaultSessionValues: {
            sessionName: sessionItem.sessionName,
            sessionType: sessionItem.sessionType,
            sessionDate: sessionItem.sessionDate,
          },
        };
      }

      return {
        session: null,
        defaultSessionValues: {
          sessionName: sessionItem.sessionName,
          sessionType: sessionItem.sessionType,
          sessionDate: sessionItem.sessionDate,
        },
      };
    }),
  );

  return (
    <div>
      <IntroHeader />
      {interventionSessions.map(({ session, defaultSessionValues }) => (
        <SchoolReportCard
          key={session?.sessionName ?? defaultSessionValues.sessionName}
          name={session?.sessionName ?? defaultSessionValues.sessionName}
          saved={session !== null}
          occurring={session?.occurred || false}
          savedSession={session}
          payload={{
            occurred: !(session?.occurred || false),
            sessionName:
              session?.sessionName ?? defaultSessionValues.sessionName,
            sessionDate:
              session?.sessionDate ?? defaultSessionValues.sessionDate,
            sessionType:
              session?.sessionType ?? defaultSessionValues.sessionType,
            yearOfImplementation:
              session?.sessionDate.getFullYear() || new Date().getFullYear(),
            schoolId: assignedSchoolId,
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
