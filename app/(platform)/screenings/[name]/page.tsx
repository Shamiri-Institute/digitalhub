import { Icons } from "#/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import CaseHeader from "./case-header";
import { CaseNotePlan } from "./case-notes-plan";
import ConsultingClinicalExpert from "./consulting-clinical-expert";
import { PresentingIssues } from "./presenting-issues";
import { ReferralDetails } from "./referral-details";
import { Sessions } from "./student-sessions";

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

function StudentCaseTabs() {
  return (
    <div className="mt-4">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger
            className={cn(
              "items-right border border-border/50 bg-white px-5",
              // [data-state='open']  && "bg-muted-green"
              "bg-shamiri-blue",
            )}
            iconClass={"h-7 w-7 mr-3 text-brand"}
          >
            <div className="flex items-center">
              <Icons.issueIcon className="mr-2 h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
              <span className="items-center align-middle">
                Presenting Issues
              </span>
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
        <AccordionItem value="item-4">
          <AccordionTrigger
            className={"items-right border border-border/50 bg-white px-5"}
            iconClass={"h-7 w-7 mr-3 text-brand"}
          >
            <div className="flex items-center">
              <Icons.heartPulse className="mr-2 h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
              <span className="items-center align-middle">
                Consulting clinical expert
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ConsultingClinicalExpert />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator className="mt-4" />
    </div>
  );
}
