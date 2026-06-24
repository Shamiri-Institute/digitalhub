"use client";

import type { FellowGroupReport } from "@prisma/client";
import { format } from "date-fns";
import type { Dispatch, SetStateAction } from "react";
import {
  ADAPTATION_TYPE_OPTIONS,
  CHALLENGE_IMPACT_OPTIONS,
  CONFIDENCE_OPTIONS,
  FREQUENCY_OPTIONS,
  labelFor,
  RELATIONSHIP_OPTIONS,
  SUPPORT_TYPE_OPTIONS,
  TRANSFER_OPTIONS,
} from "#/components/common/group/fellow-group-report-options";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";

function Answer({ question, value }: { question: string; value: string }) {
  return (
    <div className="flex flex-col space-y-1 py-2">
      <span className="text-sm font-medium text-shamiri-text-dark-grey">{question}</span>
      <span className="text-sm text-shamiri-text-grey">{value}</span>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col space-y-1 py-4">
      <span className="text-lg font-semibold text-shamiri-text-dark-grey">{title}</span>
      {children}
    </div>
  );
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

export default function FellowGroupReportView({
  report,
  groupName,
  open,
  onOpenChange,
}: {
  report: FellowGroupReport;
  groupName: string;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="flex flex-col border-b px-6 py-4 text-left">
          <DialogTitle className="text-xl font-bold">Group Report</DialogTitle>
          <span className="text-sm text-shamiri-text-grey">
            {groupName} · Submitted {format(report.submittedAt, "dd MMM yyyy")}
          </span>
        </DialogHeader>

        <div className="flex-1 divide-y overflow-y-auto px-6 py-2">
          <SectionBlock title="Section 1 — Fidelity">
            <Answer
              question="How often were the core session activities completed in full?"
              value={labelFor(FREQUENCY_OPTIONS, report.structuralFidelity)}
            />
            <Answer
              question="How often were the core activities delivered with the intended quality, not just completed?"
              value={labelFor(FREQUENCY_OPTIONS, report.processFidelity)}
            />
          </SectionBlock>

          <SectionBlock title="Section 2 — Adaptations">
            <Answer
              question="Were any repeated adaptations made across the cycle?"
              value={yesNo(report.adaptationsMade)}
            />
            {report.adaptationsMade ? (
              <>
                <Answer
                  question="If yes, what type was most common?"
                  value={labelFor(ADAPTATION_TYPE_OPTIONS, report.adaptationType)}
                />
                <Answer
                  question="If yes, briefly describe the main reason"
                  value={report.adaptationReason ?? "—"}
                />
              </>
            ) : null}
          </SectionBlock>

          <SectionBlock title="Section 3 — Student Engagement">
            <Answer
              question="How often did most students actively participate in session activities?"
              value={labelFor(FREQUENCY_OPTIONS, report.behavioralEngagement)}
            />
            <Answer
              question="How often did students engage reflectively — asking questions, making personal connections, or showing genuine curiosity?"
              value={labelFor(FREQUENCY_OPTIONS, report.reflectiveEngagement)}
            />
          </SectionBlock>

          <SectionBlock title="Section 4 — Group Climate">
            <Answer
              question="How often did students share their thoughts and feelings openly during sessions?"
              value={labelFor(FREQUENCY_OPTIONS, report.psychologicalSafety)}
            />
            <Answer
              question="How often did students respond to and support each other, rather than engaging only with the Fellow?"
              value={labelFor(FREQUENCY_OPTIONS, report.groupCohesion)}
            />
            <Answer
              question="Was there notable conflict, teasing, disruption, or avoidance during the cycle?"
              value={yesNo(report.climateConcerns)}
            />
            {report.climateConcerns ? (
              <Answer question="Describe briefly." value={report.climateConcernsDetail ?? "—"} />
            ) : null}
          </SectionBlock>

          <SectionBlock title="Section 5 — Skill Uptake and Transfer">
            <Answer
              question="How often did students seem to grasp the main session ideas — for example, being able to describe them in their own words?"
              value={labelFor(FREQUENCY_OPTIONS, report.skillComprehension)}
            />
            <Answer
              question="How often did students reference or apply ideas from earlier sessions in later sessions?"
              value={labelFor(TRANSFER_OPTIONS, report.inSessionTransfer)}
            />
            <Answer
              question="How often did students engage with home practice activities?"
              value={
                report.homePracticeApplicable
                  ? labelFor(FREQUENCY_OPTIONS, report.homePracticeEngagement)
                  : "Not applicable"
              }
            />
          </SectionBlock>

          <SectionBlock title="Section 6 — Fellow-Group Relationship">
            <Answer
              question="Overall, how would you rate your relationship and rapport with this group?"
              value={labelFor(RELATIONSHIP_OPTIONS, report.fellowGroupRelationship)}
            />
          </SectionBlock>

          <SectionBlock title="Section 7 — Implementation Context">
            <Answer
              question="Were there any significant external disruptions during this cycle that may have affected the group (e.g., exams, school events, community stressors)?"
              value={yesNo(report.externalDisruptions)}
            />
            {report.externalDisruptions ? (
              <Answer
                question="Describe briefly."
                value={report.externalDisruptionsDetail ?? "—"}
              />
            ) : null}
          </SectionBlock>

          <SectionBlock title="Section 8 — Fellow Experience and Reflection">
            <Answer
              question="Overall, how confident did you feel facilitating this group?"
              value={labelFor(CONFIDENCE_OPTIONS, report.facilitatorConfidence)}
            />
            <Answer
              question="What was hardest about facilitating this group?"
              value={report.hardestAspect}
            />
            <Answer
              question="How much did this challenge affect your ability to deliver the sessions as intended?"
              value={labelFor(CHALLENGE_IMPACT_OPTIONS, report.challengeImpact)}
            />
            <Answer question="What went well with this group?" value={report.whatWentWell} />
          </SectionBlock>

          <SectionBlock title="Section 9 — Supervision and Support">
            <Answer
              question="What type of support would have been most helpful during this cycle?"
              value={labelFor(SUPPORT_TYPE_OPTIONS, report.supportType)}
            />
            {report.supportDetail ? (
              <Answer question="Briefly describe." value={report.supportDetail} />
            ) : null}
          </SectionBlock>
        </div>
      </DialogContent>
    </Dialog>
  );
}
