"use client";
import { Icons } from "#/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Button } from "#/components/ui/button";
import { Form, FormField } from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";

import { AddNoteDialog } from "#/app/(platform)/profile/school-report/[session]/add-note-dialogue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

export default function ReportDetails({
  params,
}: {
  params: { session: string };
}) {
  const { session } = params;
  let sessionName = session.replace(/%20/g, " ");

  return (
    <div>
      <Header session={sessionName} />
      <Rating />
      <ReportComponent />
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
          <button>
            <Icons.chevronLeft className="h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
          </button>
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

const FormSchema = z.object({
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

function ReportComponent() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      positiveHighlight: "",
      reportedChallenge: "",
      recommendations: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    // todo: submit the form (weekly report)
    toast({ title: "Report submitted successfully" });
  }

  return (
    <div className="px-6">
      <Form {...form}>
        <form
          id="weeklyReportForm"
          onSubmit={form.handleSubmit(onSubmit)}
          className="overflow-hidden text-ellipsis px-1"
        >
          <FormField
            control={form.control}
            name="positiveHighlight"
            render={({ field }) => (
              <div className="mt-3 grid w-full gap-1.5">
                <Label htmlFor="emails">Positive Highlights</Label>
                <Textarea
                  id="positiveHighlight"
                  name="positiveHighlight"
                  onChange={field.onChange}
                  defaultValue={field.value}
                  placeholder="Write here..."
                  className="mt-1.5 resize-none bg-card"
                  rows={10}
                />
              </div>
            )}
          />
          <FormField
            control={form.control}
            name="reportedChallenge"
            render={({ field }) => (
              <div className="mt-6 grid w-full gap-1.5">
                <Label htmlFor="emails">Reported Challenges</Label>
                <Textarea
                  id="reportedChallenge"
                  name="reportedChallenge"
                  onChange={field.onChange}
                  defaultValue={field.value}
                  placeholder="Write here..."
                  className="mt-1.5 resize-none bg-card"
                  rows={10}
                />
              </div>
            )}
          />
          <FormField
            control={form.control}
            name="recommendations"
            render={({ field }) => (
              <div className="mt-6 grid w-full gap-1.5">
                <Label htmlFor="emails">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  name="recommendations"
                  onChange={field.onChange}
                  defaultValue={field.value}
                  placeholder="Write here..."
                  className="mt-1.5 resize-none bg-card"
                  rows={10}
                />
              </div>
            )}
          />
        </form>
      </Form>
    </div>
  );
}

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
