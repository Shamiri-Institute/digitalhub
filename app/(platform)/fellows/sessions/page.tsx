import Link from "next/link";

import { currentSupervisor } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { Icons } from "#/components/icons";
import { db } from "#/lib/db";
import { SessionHistory } from "./session-history";

export default async function FellowSessionsPage() {
  const supervisor = await currentSupervisor();
  if (!supervisor) {
    return <InvalidPersonnelRole role="supervisor" />;
  }

  const allFellowsInHub = await db.fellow.findMany({
    where: {
      hubId: supervisor.hubId,
    },
    include: {
      hub: true,
      fellowAttendances: true,
    },
  });

  return (
    <main>
      <Header />
      <SessionHistory fellows={allFellowsInHub} />
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
        <h1 className="text-lg font-bold text-brand">Sessions Attended</h1>
        <div className="h-5 w-5"></div>
      </div>
    </header>
  );
}
