"use client";

import { CurrentSupervisor } from "#/app/auth";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "#/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";
import differenceInYears from "date-fns/differenceInYears";
import { useState } from "react";
import FellowDetailsForm from "./fellow-management-form";

export default function FellowCard({
  fellow,
  assigned,
}: {
  fellow: CurrentSupervisor["fellows"][number];
  assigned?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const closeDialog = () => setOpen(false);

  return (
    <Card
      className={cn("mb-4 flex flex-col gap-5 p-5 pr-3.5", {
        "bg-white": !assigned,
        "bg-brand": assigned,
      })}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b border-border/50 pb-3 pr-3",
          {
            "border-border/20": assigned,
          },
        )}
      >
        <div>
          <h3 className={cn("font-semibold text-brand xl:text-xl")}>
            {fellow.fellowName}
          </h3>
          <p className="text-xs font-medium text-muted-foreground xl:text-lg">
            Shamiri ID: {fellow.visibleId}
          </p>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <div>
              <Icons.moreHorizontal className="h-5 w-5 text-brand" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="space-y-4 p-4">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger>Edit Details</DialogTrigger>
              <DialogContent className="max-h-screen overflow-y-scroll">
                <FellowDetailsForm fellow={fellow} closeDialog={closeDialog} />
              </DialogContent>
            </Dialog>
            <div>Session History</div>
            <div>Submit complaint</div>
            <div>Dropout fellow</div>
            <div>Weekly Evaluation</div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col ">
        <div className="flex justify-between">
          <div className="flex flex-col ">
            <div className="flex justify-start gap-2">
              <p className="text-base font-medium text-muted-foreground xl:text-lg">
                Age:
              </p>
              <p className="text-base font-semibold text-brand xl:text-lg">
                {fellow.dateOfBirth
                  ? differenceInYears(new Date(), fellow.dateOfBirth)
                  : "N/A"}
              </p>
            </div>
            <div className="flex justify-start gap-2">
              <p className="text-base font-medium text-muted-foreground xl:text-lg">
                Gender:
              </p>
              <p className="text-base font-semibold text-brand xl:text-lg">
                {fellow.gender}
              </p>
            </div>
            <div className="flex justify-start gap-2">
              <p className="text-base font-medium text-muted-foreground xl:text-lg">
                Contact:
              </p>
              <p className="text-base font-semibold text-brand xl:text-lg">
                {fellow.cellNumber}
              </p>
            </div>
            <div className="flex justify-start gap-2">
              <p className="text-base font-medium text-muted-foreground xl:text-lg">
                Mpesa:
              </p>
              <p className="text-base font-semibold text-brand xl:text-lg">
                {fellow.mpesaNumber}
              </p>
            </div>
            <div className="flex justify-start gap-2">
              <p className="text-base font-medium text-muted-foreground xl:text-lg">
                Hub:
              </p>
              <p className="text-base font-semibold text-brand xl:text-lg">
                {fellow.hub?.hubName}
              </p>
            </div>
            <div className="flex justify-start gap-2">
              <p className="text-base font-medium text-muted-foreground xl:text-lg">
                County:
              </p>
              <p className="text-base font-semibold text-brand xl:text-lg">
                {fellow.county ?? "N/A"}
              </p>
            </div>
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
