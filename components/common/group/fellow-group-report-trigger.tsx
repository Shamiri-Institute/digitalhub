"use client";

import type { FellowGroupReport } from "@prisma/client";
import { format } from "date-fns";
import { CheckCircle2, Eye } from "lucide-react";
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

  if (report) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-green-border bg-green-bg p-4">
        <div className="flex items-center gap-2 text-green-base">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="font-semibold">Group Report submitted</span>
        </div>
        <span className="text-sm text-shamiri-text-grey">
          Submitted on {format(report.submittedAt, "dd MMM yyyy")}. This report is final and can no
          longer be edited.
        </span>
        <Button
          type="button"
          variant="outline"
          className="w-fit gap-2 bg-white"
          onClick={() => setViewOpen(true)}
        >
          <Eye className="h-4 w-4" />
          View report
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
