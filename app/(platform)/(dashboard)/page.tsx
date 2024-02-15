import Link from "next/link";

import { SessionSchedule } from "#/app/(platform)/(dashboard)/session-schedule";
import { ClinicalFeatureCard } from "#/app/(platform)/clinical-feature-card";
import { Header } from "#/app/(platform)/common";
import { currentSupervisor } from "#/app/auth";
import { Icon, Icons } from "#/components/icons";
import { Card } from "#/components/ui/card";
import { db } from "#/lib/db";
import { sessionDisplayName } from "#/lib/utils";

export default async function HomePage() {
  return <SupervisorView />;
}

async function SupervisorView() {
  const supervisor = await currentSupervisor();
  if (!supervisor) {
    return <div>Not a supervisor</div>;
  }

  const fellowCount = await db.fellow.count({
    where: { supervisorId: supervisor.id },
  });
  const schoolCount = await db.school.count({
    where: { hubId: supervisor.hubId },
  });

  const interventionSessions =
    supervisor.hub?.schools
      .flatMap((school) =>
        school.interventionSessions
          .filter((ins) => ins.occurred)
          .map((is) => ({
            ...is,
            schoolName: school.schoolName,
            schoolVisibleId: school.visibleId,
          })),
      )
      .map((session) => ({
        title: `${session.schoolName}, ${sessionDisplayName(
          session.sessionType,
        )}`,
        date: session.sessionDate,
        duration: 1,
        schoolHref: `/schools/${session.schoolVisibleId}`,
      })) || [];

  return (
    <div>
      <div className="mb-8 mt-8 md:mt-0">
        <Header
          personnelName={supervisor.supervisorName || "N/A"}
          hubName={supervisor.hub?.hubName || "N/A"}
          roleName={"Supervisor"}
        />
      </div>

      <div className="mt-8">
        <SupervisorOverviewCards
          fellowCount={fellowCount}
          schoolCount={schoolCount}
          supervisorId={supervisor.id}
        />
      </div>

      <div className="mt-8 max-w-3xl">
        <h3 className="mt-4 text-base font-semibold text-brand xl:text-2xl">
          Sessions
        </h3>
        <div className="mt-4">
          <SessionSchedule sessions={interventionSessions} />
        </div>
      </div>

      {/* <div className="mt-12">
        <h3 className="mt-4 text-base font-semibold text-brand xl:text-2xl">
          Recently opened
        </h3>
        <div className="mb-10 mt-4">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2  xl:grid-cols-3">
            Coming soon...
          </div>
        </div>
      </div> */}
    </div>
  );
}

async function SupervisorOverviewCards({
  fellowCount,
  schoolCount,
  supervisorId,
}: {
  fellowCount: number;
  schoolCount: number;
  supervisorId: string;
}) {
  const clinicalCases = await db.clinicalScreeningInfo.findMany({
    where: {
      currentSupervisorId: supervisorId,
    },
  });

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 xs:grid-cols-2 sm:grid-cols-3 sm:gap-6">
      <FeatureCard
        href="/profile" // TODO: see if these are supposed to be clickable
        title="Fellows"
        stat={fellowCount}
        Icon={Icons.users}
      />
      <FeatureCard
        href="/schools"
        title="Schools"
        stat={schoolCount}
        Icon={Icons.schoolMinusOutline}
      />
      <ClinicalFeatureCard clinicalCases={clinicalCases} />
    </div>
  );
}

function FeatureCard({
  href,
  title,
  stat,
  Icon,
}: {
  href: string;
  title: string;
  stat: number;
  Icon: Icon;
}) {
  return (
    <Link href={href} className="h-full">
      <Card className="flex h-full flex-col gap-5 bg-active-card px-6 py-3">
        <div className="flex h-full flex-col justify-between py-2">
          <div className="flex items-center align-middle">
            <Icon className="mr-4 h-4 w-4 text-active-card-foreground xl:h-7 xl:w-7" />
            <h3 className="text-base font-semibold text-active-card-foreground xl:text-2xl xl:font-medium">
              {title}
            </h3>
          </div>
          <div>
            <p className="text-7xl font-bold text-active-card-foreground-accent">
              {stat}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
