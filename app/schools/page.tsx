import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";

export default function SchoolsPage() {
  return (
    <>
      <Header />
      <SchoolsList />
    </>
  );
}

function Header() {
  return (
    <div className="flex justify-between items-center mt-4 lg:mt-0 py-4">
      <div className="flex align-middle bg-green items-center">
        <Icons.schoolMinusOutline className="h-6 w-6 text-brand mr-4 align-baseline" />
        <h3 className="font-semibold text-2xl text-brand">Schools</h3>
      </div>
      <Icons.search className="h-6 w-6 text-brand mr-4 align-baseline" />
    </div>
  );
}

function SchoolsList() {
  const sessionTypes = ["Pre", "S1", "S2", "S3", "S4"];
  const assignedSchool = {
    name: "Maranda Sec School",
    population: 1400,
    sessions: ["Pre", "S1"],
    fellowsCount: 15,
    type: "Public",
    county: "Nairobi",
    pointPerson: "Benny Otieno",
    contactNo: "+254712342314780",
    demographics: "Mixed",
  };
  const otherSchools = [
    {
      name: "Our Lady of Fatima High School",
      population: 1400,
      sessions: ["Pre", "S1", "S2", "S3"],
      fellowsCount: 15,
      type: "Public",
      county: "Nairobi",
      pointPerson: "Benny Otieno",
      contactNo: "+254712342314780",
      demographics: "Mixed",
    },
    {
      name: "Alliance Sec School",
      population: 124,
      sessions: ["Pre"],
      fellowsCount: 9,
      type: "Public",
      county: "Nairobi",
      pointPerson: "Benny Otieno",
      contactNo: "+254712342314780",
      demographics: "Mixed",
    },
    {
      name: "Maseno Sec School",
      population: 124,
      sessions: [],
      fellowsCount: 9,
      type: "Public",
      county: "Nairobi",
      pointPerson: "Benny Otieno",
      contactNo: "+254712342314780",
      demographics: "Mixed",
    },
  ];

  return (
    <div>
      <div>
        <h2 className="text-xl font-semibold py-3">My School</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:grid-cols-3  sm:gap-6">
          <SchoolCard
            key={assignedSchool.name}
            school={assignedSchool}
            sessionTypes={sessionTypes}
            assigned
          />
          <div />
          <div />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold py-3">Others</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:grid-cols-3  sm:gap-6">
          {otherSchools.map((school) => (
            <SchoolCard
              key={school.name}
              school={school}
              sessionTypes={sessionTypes}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SchoolCard({
  school,
  sessionTypes,
  assigned,
}: {
  school: any;
  sessionTypes: any;
  assigned?: boolean;
}) {
  const SchoolDetail = ({ label, value }: { label: string; value: string }) => (
    <p
      className={cn("text-sm pb-2 font-medium", {
        "text-white": assigned,
        "text-brand": !assigned,
      })}
    >
      <span
        className={cn({
          "text-[#cccccc]": assigned,
        })}
      >
        {label}:
      </span>{" "}
      {value}
    </p>
  );

  return (
    <Card
      className={cn("p-5 pr-3.5 flex flex-col gap-5 mb-4", {
        "bg-white": !assigned,
        "bg-brand": assigned,
      })}
    >
      <div
        className={cn(
          "flex items-center gap-4 border-b border-border/50 pb-3 pr-3 justify-between",
          "grid grid-cols-[15fr,10fr]",
          {
            "border-border/20": assigned,
          }
        )}
      >
        <div>
          <h3
            className={cn("font-semibold xl:text-xl", {
              "text-white": assigned,
              "text-brand": !assigned,
            })}
          >
            {school.name}
          </h3>
        </div>
        <div
          className={cn("flex justify-between border-l border-border/50 pl-4", {
            "border-border/20": assigned,
          })}
        >
          <div className="flex flex-col gap-[1px]">
            <p
              className={cn("font-semibold xl:text-2xl", {
                "text-white": assigned,
                "text-brand": !assigned,
              })}
            >
              {school.population}
            </p>
            <p
              className={cn(
                "text-xs xl:text-lg text-muted-foreground font-medium",
                {
                  "text-[#cccccc]": assigned,
                }
              )}
            >
              Students
            </p>
          </div>
          {assigned && (
            <div className="pt-1">
              <Icons.edit className="text-shamiri-light-blue" />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-between">
        <div className="flex gap-3">
          {sessionTypes.map((sessiontype: any) => (
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
      <Separator
        className={cn({
          "bg-border/20": assigned,
        })}
      />
      <div className="relative justify-between items-center">
        <div className="absolute flex gap-5">
          <button>
            <Icons.calendarDateAppointmentTime
              className={cn("h-7 w-7", {
                "text-shamiri-light-blue": assigned,
              })}
            />
          </button>
          <button>
            <Icons.paperFileText
              className={cn("h-7 w-7", {
                "text-shamiri-light-blue": assigned,
              })}
            />
          </button>
        </div>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger
              className={cn("items-right py-0 pb-4 border-b border-border/50", {
                "border-border/20": assigned,
              })}
              iconClass={cn("h-7 w-7", {
                "text-shamiri-light-blue": assigned,
              })}
            >
              <span className="invisible">School Details</span>
            </AccordionTrigger>

            <AccordionContent>
              <div className="pt-4">
                <SchoolDetail label="Type" value={school.type} />
                <SchoolDetail label="County" value={school.county} />
                <SchoolDetail label="Point person" value={school.pointPerson} />
                <SchoolDetail label="Contact number" value={school.contactNo} />
                <SchoolDetail
                  label="School demographics"
                  value={school.demographics}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Card>
  );
}
