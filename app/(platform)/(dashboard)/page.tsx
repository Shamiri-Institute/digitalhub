import Link from "next/link";

import { SessionSchedule } from "#/app/(platform)/(dashboard)/session-schedule";
import { ClinicalFeatureCard } from "#/app/(platform)/clinical-feature-card";
import { Header } from "#/app/(platform)/common";
import { HubCoordinatorView } from "#/app/(platform)/hub-coordinator-view";
import { getCurrentPersonnel } from "#/app/auth";
import { Icon, Icons } from "#/components/icons";
import { Card } from "#/components/ui/card";
import { db } from "#/lib/db";

export default async function HomePage() {
  let demoRole = "supervisor";

  if (demoRole === "hub-coordinator") {
    return <HubCoordinatorView />;
  }

  if (demoRole === "supervisor") {
    return <SupervisorView />;
  }

  return <div>Unknown role</div>;
}

async function SupervisorView() {
  const supervisor = await getCurrentPersonnel();
  if (!supervisor) {
    return <div>Not a supervisor</div>;
  }

  const fellowCount = await db.fellow.count({
    where: { supervisorId: supervisor.id },
  });
  const schoolCount = await db.school.count({
    where: { hubId: supervisor.hubId },
  });

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
          <SessionSchedule
            sessions={[
              {
                title: "Kamkunji, S01",
                date: new Date("2023-11-05T19:30:00Z"),
                duration: 1,
              },
            ]}
          />
        </div>
      </div>

      <div className="mt-12">
        <h3 className="mt-4 text-base font-semibold text-brand xl:text-2xl">
          Recently opened
        </h3>
        <div className="mb-10 mt-4">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2  xl:grid-cols-3">
            Coming soon...
          </div>
        </div>
      </div>
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
  const clinical_cases = await db.clinicalScreeningInfo.findMany({
    where: {
      currentSupervisorId: supervisorId,
    },
  });

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 xs:grid-cols-2 sm:grid-cols-3 sm:gap-6">
      <FeatureCard
        href="/fellows" // TODO: see if these are supposed to be clickable
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
      <ClinicalFeatureCard clinical_cases={clinical_cases} />
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

const schools = [
  {
    name: "Maranda Sec School",
    population: 1400,
    sessions: ["Pre", "S1"],
    fellowsCount: 15,
  },
  {
    name: "Kanjeru Sec School",
    population: 23,
    sessions: ["Pre", "S1", "S2"],
    fellowsCount: 0,
  },
  {
    name: "Allaince Sec School",
    population: 100,
    sessions: ["Pre", "S1", "S3", "S4"],
    fellowsCount: 9,
  },
  {
    name: "Maseno Sec School",
    population: 400,
    sessions: ["Pre"],
    fellowsCount: 4,
  },
  {
    name: "Kamukunji Sec School",
    population: 900,
    sessions: ["Pre", "S1", "S2"],
    fellowsCount: 11,
  },
  {
    name: "Starehe Sec School",
    population: 1400,
    sessions: ["Pre"],
    fellowsCount: 7,
  },
];

function SchoolsList() {
  const sessionTypes = ["Pre", "S1", "S2", "S3", "S4"];

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2  xl:grid-cols-3">
      {/* <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6"> */}
      <div>TODO</div>
      {/* {schools.map((school) => (
        <Card key={school.name} className="flex flex-col gap-5 p-5 pr-3.5">
          <div>
            <Icons.school className="h-10 text-brand" />
          </div>
          <div className="flex items-center gap-4 border-b border-border/50 pb-3">
            <h3 className="text-base font-semibold text-brand">
              {school.name}
            </h3>
            <Separator orientation={"vertical"} />
            <div className="flex flex-col gap-[1px]">
              <p className="text-base font-semibold text-brand">
                {school.population}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                Students
              </p>
            </div>
          </div>

          <div className="flex justify-between gap-2">
            <div className="flex gap-3">
              {sessionTypes.map((sessiontype) => (
                <div key={sessiontype} className="flex flex-col items-center">
                  <p className="text-xs font-medium text-muted-foreground">
                    {sessiontype}
                  </p>
                  <div
                    className={cn("h-4 w-4 rounded-full", {
                      "bg-green-600": school.sessions.includes(sessiontype),
                      "bg-gray-300": !school.sessions.includes(sessiontype),
                    })}
                  ></div>
                </div>
              ))}
            </div>
            <Button className="flex gap-1 bg-shamiri-blue text-white hover:bg-shamiri-blue-darker">
              <Icons.users className="h-4 w-4" />
              <p className="whitespace-nowrap text-sm">
                {school.fellowsCount} Fellows
              </p>
            </Button>
          </div>
        </Card>
      ))} */}
    </div>
  );
}
