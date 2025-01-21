"use client";
import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { SessionReportType } from "#/app/(platform)/sc/reporting/school-reports/session/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { stringValidation } from "#/lib/utils";
import { useState } from "react";
import { z } from "zod";

export const ConfirmReversalSchema = z.object({
  name: stringValidation("Please enter your name"),
});

export default function ViewEditQualitativeFeedback({
  children,
  sessionReport,
  action = "view",
}: {
  children: React.ReactNode;
  sessionReport: SessionReportType["session"][number];
  action: "view" | "edit";
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] min-w-max overflow-x-auto bg-white p-5">
        <DialogHeader className="bg-white">
          <h2>{`${action === "view" ? "View" : "Edit"} school report`}</h2>
        </DialogHeader>
        <DialogAlertWidget
          label={`${action === "view" ? "View" : "Edit"} ${sessionReport.schoolName} - ${sessionReport.session} - ${sessionReport.date}`}
        />
        <div className="min-w-max space-y-2 overflow-x-auto overflow-y-scroll">
          <div className="flex flex-col items-start gap-2">
            <p className="text-shamiri">
              Student behaviour (1 unacceptable to 5 outstanding)
            </p>
            <DataTableRatingStars rating={sessionReport.avgStudentBehaviour} />
          </div>
          <div className="flex flex-col items-start gap-2">
            <p className="text-shamiri">
              Admin support (1 unacceptable to 5 outstanding)
            </p>
            <DataTableRatingStars rating={sessionReport.avgAdminSupport} />
          </div>
          <div className="flex flex-col items-start gap-2">
            <p className="text-shamiri">
              Workload (1 unacceptable to 5 outstanding)
            </p>
            <DataTableRatingStars rating={sessionReport.avgWorkload} />
          </div>
        </div>
        <Separator />
        {sessionReport.sessionNotes.map((note) => (
          <div key={note.sessionNoteId}>
            <p>{mapSessionNotesKindToTitle(note.kind)}</p>
            <Textarea
              value={note.content}
              rows={5}
              disabled={action === "view"}
            />
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}

function mapSessionNotesKindToTitle(kind: string) {
  switch (kind) {
    case "positive-highlights":
      return "Positive Highlights";
    case "reported-challenges":
      return "Reported Challenges";
    case "recommendations":
      return "Recommendations";
    default:
      return "Other";
  }
}
