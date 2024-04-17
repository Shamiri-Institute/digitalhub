"use client";

import differenceInYears from "date-fns/differenceInYears";
import Link from "next/link";
import { useState } from "react";

import { RequestRepaymentDialog } from "#/app/(platform)/profile/components/request-repayment-dialog";
import type { CurrentSupervisor } from "#/app/auth";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "#/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";
import {
  FellowDropoutDialog,
  FellowUndropoutDialog,
} from "../../schools/[visibleId]/dropout-dialog";
import FellowComplaintForm from "./fellow-complaint-form";
import FellowDetailsForm from "./fellow-management-form";
import FellowEvaluationForm from "./overall-evaluation-form";
import ReportingNotesForm from "./reporting-notes-form";
import WeeklyEvaluationForm from "./weekly-fellow-evaluation-form";

export default function FellowCard({
  fellow,
  assigned,
}: {
  fellow: NonNullable<CurrentSupervisor>["fellows"][number];
  assigned?: boolean;
}) {
  return (
    <Card
      className={cn("mb-4 flex flex-col gap-5 p-5 pr-3.5", {
        "bg-white": !assigned,
        "bg-brand": assigned,
      })}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-4 border-b border-border/50 pb-3 ",
          "grid grid-cols-[15fr,10fr]",
          {
            "border-border/20": assigned,
          },
        )}
      >
        <div>
          <h3 className="text-lg font-semibold text-brand">
            {fellow.fellowName}
          </h3>
          <p className="text-xs font-medium text-muted-foreground lg:text-sm">
            Shamiri ID: {fellow.visibleId}
          </p>
          {(fellow.droppedOutAt || fellow.droppedOut) && (
            <div>
              <span className="inline-flex items-center rounded-md bg-zinc-50 px-1.5 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10">
                Dropped Out
              </span>
            </div>
          )}
        </div>
        <div className={cn("flex items-start justify-end")}>
          <FellowCardMenu fellow={fellow}>
            <button className="flex flex-col gap-[1px]">
              <div>
                <Icons.moreVertical className="h-5 w-5 text-brand" />
              </div>
            </button>
          </FellowCardMenu>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex justify-between">
          <div className="flex flex-col">
            <CardDetailLineItem
              label="Age"
              value={
                fellow.dateOfBirth
                  ? differenceInYears(new Date(), fellow.dateOfBirth).toString()
                  : null
              }
            />
            <CardDetailLineItem label="Gender" value={fellow.gender} />
            <CardDetailLineItem
              label="Contact"
              value={fellow.cellNumber || null}
            />
            <CardDetailLineItem
              label="MPESA"
              value={fellow.mpesaNumber || null}
            />
            <CardDetailLineItem
              label="Hub"
              value={fellow.hub?.hubName || null}
            />
            <CardDetailLineItem label="County" value={fellow.county || null} />
          </div>

          <div className="flex flex-col items-end justify-end">
            <h2 className="self-end text-right text-5xl font-semibold text-shamiri-blue">
              {fellow.fellowAttendances.reduce(
                (acc, val) => (val.attended ? acc + 1 : acc),
                0,
              )}
            </h2>
            <p className="text-right text-xs font-medium text-brand">
              Sessions attended
            </p>
          </div>
        </div>
        {/* TODO: this should take you to the /groups */}
        <Button className="mt-4 w-full bg-shamiri-blue hover:bg-brand">
          Groups
        </Button>
      </div>
    </Card>
  );
}

function CardDetailLineItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex justify-start gap-2">
      <p className="text-sm font-medium text-muted-foreground">{label}:</p>
      <p className="text-sm font-semibold text-brand">{value || "N/A"}</p>
    </div>
  );
}

function FellowCardMenu({
  fellow,
  children,
}: {
  fellow: NonNullable<CurrentSupervisor>["fellows"][number];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const closeDialog = () => setOpen(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="p-1 text-sm">
        <MenuLineItem>
          <Link href={`/fellows/sessions?fid=${fellow.visibleId}`}>
            Session History
          </Link>
        </MenuLineItem>
        <MenuLineItem>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>Edit Details</DialogTrigger>
            <DialogContent className="max-h-screen overflow-y-scroll">
              <FellowDetailsForm fellow={fellow} closeDialog={closeDialog} />
            </DialogContent>
          </Dialog>
        </MenuLineItem>
        <MenuLineItem>
          <WeeklyEvaluationForm
            fellowId={fellow.id}
            supervisorId={fellow.supervisorId ?? ""}
            previousRatings={fellow.weeklyFellowRatings}
          >
            <div className="cursor-pointer">Weekly Evaluation</div>
          </WeeklyEvaluationForm>
        </MenuLineItem>
        <DropdownMenuSeparator className="my-2" />
        <MenuLineItem>
          <FellowEvaluationForm
            fellowName={fellow.fellowName ?? ""}
            behaviourRating={fellow.behaviourRating}
            programDeliveryRating={fellow.programDeliveryRating}
            dressingAndGroomingRating={fellow.dressingAndGroomingRating}
            punctualityRating={fellow.punctualityRating}
            fellowId={fellow.id}
            supervisorId={fellow.supervisorId ?? ""}
            previousReportingNotes={fellow.fellowReportingNotes ?? []}
          >
            <div className="cursor-pointer">Complete Overall Evaluation</div>
          </FellowEvaluationForm>
        </MenuLineItem>
        <MenuLineItem>
          <FellowComplaintForm
            fellowId={fellow.id}
            supervisorId={fellow.supervisorId ?? ""}
            complaints={fellow.fellowComplaints}
          >
            <div className="cursor-pointer">Submit Complaint</div>
          </FellowComplaintForm>
        </MenuLineItem>
        <MenuLineItem>
          <RequestRepaymentDialog fellow={fellow}>
            Request Repayment
          </RequestRepaymentDialog>
        </MenuLineItem>
        <MenuLineItem>
          {(!fellow.droppedOutAt || !fellow.droppedOut) && (
            <FellowDropoutDialog fellow={fellow} revalidationPath="/profile">
              <div className="cursor-pointer">Dropout Fellow</div>
            </FellowDropoutDialog>
          )}
          {(fellow.droppedOutAt || fellow.droppedOut) && (
            <FellowUndropoutDialog
              fellow={fellow}
              revalidationPath={`/profile`}
            >
              <div className="cursor-pointer">Un-dropout Fellow</div>
            </FellowUndropoutDialog>
          )}
        </MenuLineItem>
        <MenuLineItem>
          <ReportingNotesForm
            supervisorId={fellow.supervisorId ?? ""}
            fellowId={fellow.id ?? ""}
            fellowName={fellow.fellowName ?? ""}
            reportingNotes={fellow.fellowReportingNotes}
          >
            <div className="cursor-pointer">Add reporting notes</div>
          </ReportingNotesForm>
        </MenuLineItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuLineItem({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-md p-1 hover:bg-zinc-100",
        "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      )}
    >
      {children}
    </div>
  );
}
