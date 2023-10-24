import Link from "next/link";

import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";

import { currentHub } from "#/app/auth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { db } from "#/lib/db";

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
    <div className="mt-4 flex items-center justify-between py-4 lg:mt-0">
      <div className="bg-green flex items-center align-middle">
        <Icons.schoolMinusOutline className="mr-4 h-6 w-6 align-baseline text-brand" />
        <h3 className="text-2xl font-semibold text-brand">Schools</h3>
      </div>
      <Icons.search className="mr-4 h-6 w-6 align-baseline text-brand" />
    </div>
  );
}

async function SchoolsList() {
  const sessionTypes = ["Pre", "S1", "S2", "S3", "S4"];
  // const assignedSchool = {
  //   name: "Maranda Sec School",
  //   population: 1400,
  //   sessions: ["Pre", "S1"],
  //   fellowsCount: 15,
  //   type: "Public",
  //   county: "Nairobi",
  //   pointPerson: "Benny Otieno",
  //   contactNo: "+254712342314780",
  //   demographics: "Mixed",
  // };
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

  // const otherSchools = [
  //   {
  //     name: "Our Lady of Fatima High School",
  //     population: 1400,
  //     sessions: ["Pre", "S1", "S2", "S3"],
  //     fellowsCount: 15,
  //     type: "Public",
  //     county: "Nairobi",
  //     pointPerson: "Benny Otieno",
  //     contactNo: "+254712342314780",
  //     demographics: "Mixed",
  //   },
  //   {
  //     name: "Alliance Sec School",
  //     population: 124,
  //     sessions: ["Pre"],
  //     fellowsCount: 9,
  //     type: "Public",
  //     county: "Nairobi",
  //     pointPerson: "Benny Otieno",
  //     contactNo: "+254712342314780",
  //     demographics: "Mixed",
  //   },
  //   {
  //     name: "Maseno Sec School",
  //     population: 124,
  //     sessions: [],
  //     fellowsCount: 9,
  //     type: "Public",
  //     county: "Nairobi",
  //     pointPerson: "Benny Otieno",
  //     contactNo: "+254712342314780",
  //     demographics: "Mixed",
  //   },
  // ];

  return (
    <div>
      <div>
        <h2 className="py-3 text-xl font-semibold">My School</h2>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2  xl:grid-cols-3">
          <SchoolCard
            key={assignedSchool.schoolName}
            school={assignedSchool}
            sessionTypes={sessionTypes}
            assigned
          />
          <div />
          <div />
        </div>
      </div>
      <div>
        <h2 className="py-3 text-xl font-semibold">Others</h2>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2  xl:grid-cols-3">
          {otherSchools.map((school) => (
            <SchoolCard
              key={school.schoolName}
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
      className={cn("pb-2 text-sm font-medium", {
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
      className={cn("mb-4 flex flex-col gap-5 p-5 pr-3.5", {
        "bg-white": !assigned,
        "bg-brand": assigned,
      })}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-4 border-b border-border/50 pb-3 pr-3",
          "grid grid-cols-[15fr,10fr]",
          {
            "border-border/20": assigned,
          },
        )}
      >
        <Link href={`/schools/${school.visibleId}`}>
          <h3
            className={cn("font-semibold xl:text-xl", {
              "text-white": assigned,
              "text-brand": !assigned,
            })}
          >
            {school.schoolName}
          </h3>
        </Link>
        <div
          className={cn(
            "flex items-start justify-between border-l border-border/50 pl-4",
            {
              "border-border/20": assigned,
            },
          )}
        >
          <Link
            href={`/schools/${school.visibleId}`}
            className="flex flex-col gap-[1px]"
          >
            <p
              className={cn("font-semibold xl:text-2xl", {
                "text-white": assigned,
                "text-brand": !assigned,
              })}
            >
              {school.numbersExpected || "N/A"}
            </p>
            <p
              className={cn(
                "text-xs font-medium text-muted-foreground xl:text-lg",
                {
                  "text-[#cccccc]": assigned,
                },
              )}
            >
              Students
            </p>
          </Link>
          {assigned && (
            <button className="mt-1">
              <Icons.edit className="text-shamiri-light-blue" />
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-between gap-2">
        <div className="flex gap-3">
          {sessionTypes.map((sessiontype: any) => (
            <div key={sessiontype} className="flex flex-col items-center">
              <p className="text-xs font-medium text-muted-foreground">
                {sessiontype}
              </p>
              <div
                className={cn("h-4 w-4 rounded-full", {
                  "bg-green-600": true,
                  "bg-gray-300": !false,
                })}
              ></div>
            </div>
          ))}
        </div>
        <Link href={`/schools/${school.visibleId}`}>
          <Button className="flex gap-1 bg-shamiri-blue text-white hover:bg-shamiri-blue-darker">
            <Icons.users className="h-4 w-4" />
            <p className="whitespace-nowrap text-sm">
              {school.fellowsCount} Fellows
            </p>
          </Button>
        </Link>
      </div>
      <Separator
        className={cn({
          "bg-border/20": assigned,
        })}
      />
      <div className="relative items-center justify-between">
        {assigned && (
          <div className="absolute left-5 flex gap-5">
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
        )}
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger
              className={cn(
                "items-right border-b border-border/50 px-5 pb-6  pt-0",
                {
                  "-mb-1": assigned,
                  "border-border/20": assigned,
                },
              )}
              iconClass={cn("h-7 w-7 mr-3", {
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
