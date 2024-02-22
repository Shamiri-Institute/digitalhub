"use client";
import { ReferralFrom } from "#/app/(platform)/screenings/[caseId]/reffered-from";
import { CurrentCase } from "#/app/(platform)/screenings/screen";
import { Icons } from "#/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import { Fellow, Supervisor } from "@prisma/client";
import ConsultingClinicalExpertComments from "./consulting-clinical-expert";
import { PresentingIssues } from "./presenting-issues";
import { ReferralToDetails } from "./referral-details";
import { Sessions } from "./student-sessions";

type SupervisorWithFellows = Supervisor & {
  fellows: Fellow[];
};

export function StudentCaseTabs({
  currentcase,
  supervisors = [],
  currentSupId,
  hubId,
}: {
  currentcase: CurrentCase;
  supervisors: SupervisorWithFellows[];
  currentSupId: string | undefined;
  hubId: string | null;
}) {
  const canReferCase = !!(
    currentcase.initialCaseHistoryId &&
    currentcase.emergencyPresentingIssues !== null
  );

  return (
    <div className="mt-4">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger
            className={cn(
              "items-right border border-border/50 bg-white px-5",
              "data-[state=open]:bg-shamiri-blue",
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
            <PresentingIssues currentcase={currentcase} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger
            className={cn(
              "items-right border border-border/50 bg-white px-5",
              "data-[state=open]:bg-shamiri-blue",
            )}
            iconClass={"h-7 w-7 mr-3 text-brand"}
          >
            <div className="flex items-center">
              <Icons.calendarDateAppointmentTime className="mr-2 h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
              <span className="items-center align-middle">Session</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Sessions
              sessions={currentcase.sessions}
              caseId={currentcase.id}
              supervisorId={currentcase.currentSupervisorId}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger
            className={cn(
              "items-right border border-border/50 bg-white px-5",
              "data-[state=open]:bg-shamiri-blue",
            )}
            iconClass={"h-7 w-7 mr-3 text-brand"}
          >
            <div className="flex items-center">
              <Icons.network className="mr-2 h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
              <span className="items-center align-middle">Initial contact</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ReferralFrom
              currentcase={currentcase}
              supervisors={supervisors}
              currentSupId={currentSupId}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4">
          <AccordionTrigger
            className={cn(
              "items-right border border-border/50 bg-white px-5",
              "data-[state=open]:bg-shamiri-blue",
            )}
            iconClass={"h-7 w-7 mr-3 text-brand"}
          >
            <div className="flex items-center">
              <Icons.referral className="mr-2 h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
              <span className="items-center align-middle">Refer To</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ReferralToDetails
              canReferCase={canReferCase}
              currentcase={currentcase}
              supervisors={supervisors}
              currentSupId={currentSupId}
              hubId={hubId}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-5">
          <AccordionTrigger
            className={cn(
              "items-right border border-border/50 bg-white px-5",
              "data-[state=open]:bg-shamiri-blue",
            )}
            iconClass={"h-7 w-7 mr-3 text-brand"}
          >
            <div className="flex items-center">
              <Icons.waveIcon className="mr-2 h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
              <span className="items-center align-middle">
                Consulting clinical expert
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ConsultingClinicalExpertComments currentcase={currentcase} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator className="mt-4" />
    </div>
  );
}
