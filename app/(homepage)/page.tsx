import Link from "next/link";

import { cn } from "#/lib/utils";
import { fetchAuthedUser } from "#/auth";
import { Icon, Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { ClinicalFeatureCard } from "#/app/(homepage)/clinical-feature-card";
import { HubCoordinatorView } from "#/app/(homepage)/hub-coordinator-view";

export default async function HomePage() {
  const user = await fetchAuthedUser();

  if (user.isRole("hub-coordinator")) return <HubCoordinatorView />;

  return <SupervisorHomepage />;
}

function SupervisorHomepage() {
  return (
    <div>
      <div className="mb-8">
        <Header />
      </div>
      <OverviewCards />
      <div className="mt-8">
        <Separator />
      </div>

      <h3 className="font-semibold text-base xl:text-2xl text-brand mt-4">
        Recently opened
      </h3>
      <div className="mt-4">
        <SchoolsList />
      </div>
    </div>
  );
}

async function Header() {
  const authedUser = await fetchAuthedUser();

  return (
    <header className="mb-4">
      <div className="flex items-center">
        <h1 className="font-semibold text-2xl text-brand pr-3">
          Hello, {authedUser.name}
        </h1>
        <Icons.smileyface className="h-6 w-6 text-brand" />
      </div>
      <p className="text-muted-foreground text-xl">Have a nice day!</p>
    </header>
  );
}

function OverviewCards() {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 mb-4">
      <FeatureCard
        href="/fellows"
        title="Fellows"
        stat={621}
        Icon={Icons.users}
      />
      <FeatureCard
        href="/schools"
        title="Schools"
        stat={341}
        Icon={Icons.schoolMinusOutline}
      />
      <ClinicalFeatureCard />
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
      <Card className="px-6 py-3 flex flex-col gap-5 bg-active-card h-full">
        <div className="h-full flex flex-col justify-between py-2">
          <div className="flex align-middle items-center">
            <Icon className="h-4 w-4 xl:h-7 xl:w-7 text-active-card-foreground mr-4" />
            <h3 className="font-semibold text-base xl:font-medium xl:text-2xl text-active-card-foreground">
              {title}
            </h3>
          </div>
          <div>
            <p className="text-active-card-foreground-accent text-7xl font-bold">
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:grid-cols-3  sm:gap-6">
      {/* <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6"> */}
      {schools.map((school) => (
        <Card key={school.name} className="p-5 pr-3.5 flex flex-col gap-5">
          <div>
            <Icons.school className="h-10 text-brand" />
          </div>
          <div className="flex items-center gap-4 border-b border-border/50 pb-3">
            <h3 className="font-semibold text-base text-brand">
              {school.name}
            </h3>
            <Separator orientation={"vertical"} />
            <div className="flex flex-col gap-[1px]">
              <p className="font-semibold text-base text-brand">
                {school.population}
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                Students
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-between">
            <div className="flex gap-3">
              {sessionTypes.map((sessiontype) => (
                <div key={sessiontype} className="flex flex-col items-center">
                  <p className="text-xs text-muted-foreground font-medium">
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
            <Button className="bg-shamiri-blue text-white flex gap-1 hover:bg-shamiri-blue-darker">
              <Icons.users className="h-4 w-4" />
              <p className="text-sm whitespace-nowrap">
                {school.fellowsCount} Fellows
              </p>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
