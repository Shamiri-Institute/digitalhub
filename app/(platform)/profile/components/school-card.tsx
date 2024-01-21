import Link from "next/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { cn, doesSessionExist } from "#/lib/utils";

import { Icons } from "#/components/icons";
import { Prisma, School } from "@prisma/client";

type sessionTypes = Prisma.InterventionSessionGetPayload<{}>[];

const expectedSessionTypesOnCard = [
  {
    id: 1,
    sessionName: "Presession",
  },
  {
    id: 2,
    sessionName: "Session 1",
  },
  {
    id: 3,
    sessionName: "Session 2",
  },
  {
    id: 4,
    sessionName: "Session 3",
  },
  {
    id: 5,
    sessionName: "Session 4",
  },
];

export function SchoolCardProfile({
  school,
  sessionTypes,
  assigned,
  fellowsCount,
}: {
  school: School;
  sessionTypes: sessionTypes;
  assigned?: boolean;
  fellowsCount?: number;
}) {
  const SchoolDetail = ({
    label,
    value,
  }: {
    label: string;
    value: string | null;
  }) => (
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
            <Link href={`/profile/myschool`}>
              <button className="mt-1">
                <Icons.edit className="text-shamiri-light-blue" />
              </button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex justify-between gap-2">
        <div className="flex gap-3">
          {expectedSessionTypesOnCard.map((sessiontype) => (
            <div key={sessiontype.id} className="flex flex-col items-center">
              <p className="text-xs font-medium text-muted-foreground">
                {sessiontype.sessionName}
              </p>
              <div
                className={cn("mt-2 h-4 w-4 rounded-full", {
                  "bg-gray-300": !doesSessionExist(
                    sessionTypes,
                    sessiontype.sessionName,
                  ),
                  "bg-green-600": doesSessionExist(
                    sessionTypes,
                    sessiontype.sessionName,
                  ),
                })}
              ></div>
            </div>
          ))}
        </div>
        <Link href={`/schools/${school.visibleId}`}>
          <Button className="flex gap-1 bg-shamiri-blue text-white hover:bg-shamiri-blue-darker">
            <Icons.users className="h-4 w-4" />
            <p className="whitespace-nowrap text-sm">
              {fellowsCount} {fellowsCount === 1 ? "Fellow" : "Fellows"}
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
            {/* <button>
              <Icons.calendarDateAppointmentTime
                className={cn("h-7 w-7", {
                  "text-shamiri-light-blue": assigned,
                })}
              />
            </button> */}
            <Link href={`/profile/school-report`}>
              <button>
                <Icons.paperFileText
                  className={cn("h-7 w-7", {
                    "text-shamiri-light-blue": assigned,
                  })}
                />
              </button>
            </Link>
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
                <SchoolDetail label="Type" value={school.schoolType} />
                <SchoolDetail label="County" value={school.schoolCounty} />
                <SchoolDetail
                  label="Point person"
                  value={school.pointPersonName}
                />
                <SchoolDetail
                  label="Contact number"
                  value={school.pointPersonPhone}
                />
                <SchoolDetail
                  label="School demographics"
                  value={school.schoolDemographics}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Card>
  );
}
