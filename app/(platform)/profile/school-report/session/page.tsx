import { ChevronDownIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AddNoteDialog } from "#/app/(platform)/profile/school-report/session/add-note-dialogue";
import { Icons } from "#/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import { WeeklyReportForm } from "./weekly-report-form";

export default async function ReportDetails({
  searchParams,
}: {
  searchParams: { id: string };
}) {
  const { id: sessionId } = searchParams;

  if (!sessionId) {
    notFound();
  }

  const session = await db.interventionSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    notFound();
  }

  return (
    <div>
      <Header session={session.sessionName} />
      <Rating />
      <WeeklyReportForm />
      <Notes />
    </div>
  );
}

const sessions = [
  "Pre session",
  "Session 01",
  "Session 02",
  "Session 03",
  "Session 04",
];

function Header({ session }: { session: string }) {
  return (
    <div>
      <div className="mt-2 flex  justify-between ">
        <Link href="/profile/school-report">
          <Icons.chevronLeft className="h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
        </Link>
        <div>
          <h3 className="text-xl font-bold text-brand">My School Report</h3>
          <h4 className="text-brand-light-gray text-center text-xs">
            Kamkunji Secondary School
          </h4>
          <div className="justify-items-center pl-8 pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="ml-auto place-self-center whitespace-nowrap px-2 py-1.5 text-[0.8125rem] font-medium md:px-4 md:py-2 md:text-sm"
                >
                  {session}
                  <ChevronDownIcon className="ml-1 h-4 w-4 md:ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sessions.map((session) => {
                  return (
                    <DropdownMenuItem
                      key={session}
                      className="relative flex justify-between pr-10"
                      // onSelect={() => {
                      // //   setRoleFilter(role);
                      //   table
                      //     .getColumn("role")
                      //     ?.setFilterValue(role === "All" ? "" : role);
                      // }}
                    >
                      {session}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div>
          {/* <button>
                        <Icons.xIcon className='h-6 w-6 align-baseline xl:h-7 xl:w-7 ' />
                    </button> */}
        </div>
      </div>
    </div>
  );
}

export const FormSchema = z.object({
  positiveHighlight: z.string({
    required_error: "Please enter the positive highlights.",
  }),
  reportedChallenge: z.string({
    required_error: "Please enter the reported challenges.",
  }),
  recommendations: z.string({
    required_error: "Please enter the recommendations.",
  }),
});

function Rating() {
  return (
    <div className="mt-4 px-6">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger
            className={"items-right border border-border/50 bg-white px-5"}
            iconClass={"h-7 w-7 mr-3 text-brand"}
          >
            <div className="flex items-center">
              <Icons.startOutline className="mr-2 h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
              <span className="items-center align-middle"> Ratings</span>
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <div className="pt-4">
              <div className="flex items-center justify-between ">
                <p className="text-sm font-normal text-brand">
                  Student behavior
                </p>
                <div className="flex flex-1  justify-end">
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                </div>
              </div>

              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm font-normal text-brand">Admin support</p>
                <div className="flex flex-1  justify-end">
                  <div>
                    <Icons.star className="h-6 w-6 align-baseline text-muted-yellow xl:h-7 xl:w-7" />
                  </div>
                  <Icons.star className="ml-4 h-6 w-6 align-baseline text-muted-yellow xl:h-7 xl:w-7" />
                  <Icons.star className="ml-4 h-6 w-6 align-baseline text-muted-yellow xl:h-7 xl:w-7" />
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                </div>
              </div>

              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm font-normal text-brand">Workload</p>
                <div className="flex flex-1  justify-end">
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                  <Icons.startOutline className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7" />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator className="mt-4" />
    </div>
  );
}

function Notes() {
  return (
    <div className="flex flex-col">
      <div className="mt-4 flex items-center justify-between pl-2 pr-8">
        <h3 className="ml-6 mt-4 text-sm font-semibold text-muted-foreground">
          Added Notes
        </h3>
      </div>
      <div className="my-4 flex pl-2 pr-8">
        <div>
          <h3 className="ml-6 mt-4 text-sm font-semibold text-muted-foreground">
            Supervisor Name
          </h3>
        </div>

        <div>
          <p className="ml-6 mt-4 text-sm font-normal text-brand">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Eveniet
            veniam autem pariatur? Placeat dolorem laborum, facilis error
            distinctio ea in optio libero quidem dicta voluptates quia,
            consequuntur sed saepe blanditiis?
          </p>
          <div className="mt-5  flex items-center justify-center">
            <p className="text-brand-light-gray text-xs font-normal">
              March 20
            </p>
            <div className="mx-2 h-6 w-0.5 bg-border/50 " />
            <p className="text-brand-light-gray text-xs font-normal ">4:18pm</p>
          </div>

          <AddNoteDialog>
            <Button
              type="submit"
              className="mt-4 w-full bg-shamiri-blue hover:bg-brand"
            >
              Add Note
            </Button>
          </AddNoteDialog>
        </div>
      </div>
    </div>
  );
}
