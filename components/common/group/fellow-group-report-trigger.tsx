"use client";

import type { FellowGroupReport } from "@prisma/client";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import FellowGroupReportForm from "#/components/common/group/fellow-group-report-form";
import FellowGroupReportView from "#/components/common/group/fellow-group-report-view";
import { Button } from "#/components/ui/button";

const SUBSTANTIVE_SESSIONS_REQUIRED = 4;

export default function FellowGroupReportTrigger({
  groupId,
  projectId,
  groupName,
  occurredSubstantiveCount,
  report,
}: {
  groupId: string;
  projectId: string;
  groupName: string;
  occurredSubstantiveCount: number;
  report: FellowGroupReport | null;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  // Submitted state — read-only.
  if (report) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-green-border bg-green-bg p-4">
        <Button
          type="button"
          variant="base"
          className="w-fit gap-2 bg-transparent p-0 text-green-base hover:bg-transparent"
          onClick={() => setViewOpen(true)}
        >
          <CheckCircledIcon className="h-5 w-5" />
          Group Report Submitted
        </Button>
        <FellowGroupReportView
          report={report}
          groupName={groupName}
          open={viewOpen}
          onOpenChange={setViewOpen}
        />
      </div>
    );
  }

  if (occurredSubstantiveCount < SUBSTANTIVE_SESSIONS_REQUIRED) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-blue-border bg-blue-bg p-4">
      <Button type="button" variant="brand" className="w-fit" onClick={() => setFormOpen(true)}>
        Complete Group Report
      </Button>
      <span className="text-sm text-shamiri-text-grey">
        Your group has reached its fourth session. Please complete the Group Report when you are
        done with your final session.
      </span>
      <FellowGroupReportForm
        groupId={groupId}
        projectId={projectId}
        groupName={groupName}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}
