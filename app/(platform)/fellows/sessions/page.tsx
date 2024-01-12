import Link from "next/link";

import { currentSupervisor } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { Icons } from "#/components/icons";
import { db } from "#/lib/db";
import { redirect } from "next/navigation";
import { SessionHistory } from "./session-history";

export default async function FellowSessionsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const fid = searchParams?.fid as string | undefined;

  const supervisor = await currentSupervisor();
  if (!supervisor) {
    return <InvalidPersonnelRole role="supervisor" />;
  }

  if (!fid) {
    const firstFellow = supervisor.fellows[0];
    if (!firstFellow) {
      return <p>No fellows assigned to you</p>;
    }
    redirect(`/profile/fellows?fid=${firstFellow.visibleId}`);
  }

  const fellow = await db.fellow.findUnique({
    where: { visibleId: fid },
    include: {
      fellowAttendances: {
        include: {
          school: true,
        },
        orderBy: {
          sessionNumber: "asc",
        },
      },
    },
  });
  if (!fellow) {
    return <p>Fellow not found with id: {fid}</p>;
  }

  const allFellowsInHub = await db.fellow.findMany({
    where: {
      hubId: supervisor.hubId,
    },
    include: {
      hub: true,
      fellowAttendances: true,
      fellowReportingNotes: {
        include: {
          supervisor: true,
        },
      },
      repaymentRequests: {
        include: {
          groupSession: {
            include: {
              session: {
                include: {
                  school: true,
                },
              },
            },
          },
        },
      },
      groupSessions: {
        include: {
          session: {
            include: {
              school: true,
            },
          },
        },
      },
    },
  });

  return (
    <main className="max-w-3xl">
      <Header />
      <SessionHistory
        fellow={fellow}
        fellows={allFellowsInHub}
        sessionsAttended={fellow?.fellowAttendances ?? []}
      />
    </main>
  );
}

function Header() {
  return (
    <header className="my-4">
      <div className="flex items-center justify-between">
        <Link href="/profile">
          <Icons.chevronLeft className="h-5 w-5 text-brand" />
        </Link>
        <h1 className="text-lg font-bold text-brand">
          Fellows — Sessions Attended
        </h1>
        <div className="h-5 w-5"></div>
      </div>
    </header>
  );
}
