import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,

} from "#/components/ui/accordion";
import { Separator } from "#/components/ui/separator";
import { ReferralDetails } from "./referral-details";
import { Sessions } from "./student-sessions";
import { PresentingIssues } from "./presenting-issues";

const ScreeningDetails = ({ params }: { params: { id: string } }) => {
  return (
    <div>
      <IntroHeader />
      <StudentCaseTabs />
    </div>
  );
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

function StudentCaseTabs() {
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
            <PresentingIssues />
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


