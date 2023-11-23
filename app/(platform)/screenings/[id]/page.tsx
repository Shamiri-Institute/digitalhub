import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Separator } from "#/components/ui/separator";
import { Card } from "#/components/ui/card";
import { Button } from "#/components/ui/button";

const ScreeningDetails = ({ params }: { params: { id: string } }) => {
  return <div>

    <h1>
      {params.id}
    </h1>
    <IntroHeader />
    <PresentingIssues />
  </div>;
};

export default ScreeningDetails;


type Colors = {
  [key: string]: string;
};

const colors: Colors = {
  active: "bg-muted-green",
  "follow-up": "bg-muted-yellow",
  referred: "bg-muted-pink",
  terminated: "bg-muted-sky",
};

const sampleReferredCasses = [
  { id: 1, status: "active" },
  { id: 3, status: "follow-up" },
  { id: 4, status: "terminated" },
  { id: 2, status: "referred" },

];



function IntroHeader() {
  return (
    <>

      <div className="flex justify-end mb-4">
        <button>
          <Icons.flagcase className="w-6 h-6 text-muted-foreground" />
        </button>
      </div>

      <div className="flex flex-1">
        <div className="flex rounded-full h-24 w-24 justify-center items-center bg-muted-green">
          <div className="rounded-full h-20 w-20 bg-muted-foreground" />
        </div>
        <div className="flex flex-col flex-1 ml-6 justify-center ">
          <div className="flex flex-col">
            <p className="text-base font-bold text-brand">Student Name</p>
            <p className="text-sm font-medium text-muted-foreground">Shamiri ID</p>
          </div>
          <div className="flex mt-1 gap-8">

            {
              sampleReferredCasses.map((stud) => (
                <button
                  key={stud.id}
                  className={cn(
                    "flex rounded-md h-7 w-12 justify-center items-center bg-muted-green",
                    colors[stud.status]
                  )}>
                  <p className="text-sm font-medium text-white ">
                    {stud.status.charAt(0).toUpperCase()}
                  </p>
                </button>
              ))
            }
          </div>
        </div>
      </div>
    </>
  )
}

function PresentingIssues() {
  return (
    <div className="mt-4">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger
            className={cn("items-right border border-border/50 bg-white px-5",
              // [data-state='open']  && "bg-muted-green"
              "bg-shamiri-blue"

            )}
            iconClass={"h-7 w-7 mr-3 text-brand"}
          >

            <div className="flex items-center">
              <Icons.issueIcon className="mr-2 h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
              <span className="items-center align-middle">Presenting Issues</span>
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
        <AccordionItem value="item-2">
          <AccordionTrigger
            className={"items-right border border-border/50 bg-white px-5"}
            iconClass={"h-7 w-7 mr-3 text-brand"}
          >
            <div className="flex items-center">
              <Icons.calendarDateAppointmentTime className="mr-2 h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
              <span className="items-center align-middle">Session</span>
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <Sessions />
            <Button variant="brand">
              Add
            </Button>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger
            className={"items-right border border-border/50 bg-white px-5"}
            iconClass={"h-7 w-7 mr-3 text-brand"}
          >
            <div className="flex items-center">
              <Icons.referral className="mr-2 h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
              <span className="items-center align-middle">Referral</span>
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <ReferralDetails />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator className="mt-4" />
    </div>
  );
}








const sample_sessions_attended = [
  {
    name: "Nishan",
    session: "1",
    date: "20 Aug 2021",
  },
  {
    name: "Sweet",
    session: "4",
    date: "19 Jan 2021",
  },
  {
    name: "Orion",
    session: "3",
    date: "03 Aug 2021",
  },
  {
    name: "Esther",
    session: "2",
    date: "20 Feb 2021",
  },

]


function Sessions() {
  return (
    <Card
      className={cn("my-2  gap-5 p-4 pr-3.5bg-white")}
    >
      <div className="flex justify-between mb-2">
        <p
          className="text-base font-medium text-muted-foreground">
          No.
        </p>
        <p
          className="text-base font-medium text-muted-foreground">
          Session Attended
        </p>
        <p
          className="text-base font-medium text-muted-foreground">
          Date
        </p>
      </div>
      <Separator />
      {
        sample_sessions_attended.map((stud) => (
          <SessionsCard key={stud.name}
            name={stud.name}
            session={stud.session}
            date={stud.date}
          />
        ))
      }
    </Card>
  )
}

function SessionsCard({
  name, session, date
}: {
  name: string;
  session: string;
  date: string;
}
) {
  return (
    <div className="flex justify-between  mt-2 border-b items-center last:border-none" >
      <p
        className="text-sm text-brand flex-1 text-left ">
        {name}
      </p>
      <p
        className="text-sm text-brand flex-1  text-center">
        {session}
      </p>
      <p
        className="text-sm text-brand flex-1  text-right"
      >
        {date}
      </p>
    </div>
  )
}

function ReferralDetails() {
  return (
    <div>
      p
    </div>
  )
}