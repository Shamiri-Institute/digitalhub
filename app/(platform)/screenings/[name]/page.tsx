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
import { CaseNotePlan } from "./case-notes-plan";
import CaseHeader from "./case-header";

const ScreeningDetails = ({ params }: { params: { name: string } }) => {
  return (
    <div>
      <CaseHeader name={params.name} />
      <StudentCaseTabs />
      <CaseNotePlan />
    </div>
  );
};

export default ScreeningDetails;

type Colors = {
  [key: string]: string;
};

export const colors: Colors = {
  active: "bg-muted-green",
  "follow-up": "bg-muted-yellow",
  referred: "bg-muted-pink",
  terminated: "bg-muted-sky",
};

export const sampleReferredCasses = [
  { id: 1, status: "active" },
  { id: 3, status: "follow-up" },
  { id: 4, status: "terminated" },
  { id: 2, status: "referred" },

];


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