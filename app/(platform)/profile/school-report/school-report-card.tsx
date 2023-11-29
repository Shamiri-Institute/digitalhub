"use client";

import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import * as React from "react";

import { SessionItem } from "#/app/(platform)/profile/school-report/page";
import { Timepicker } from "#/app/(platform)/profile/school-report/timepicker";
import {
  OccurrenceData,
  revalidateFromClient,
  toggleInterventionOccurrence,
  updateInterventionOccurrenceDate,
} from "#/app/actions";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Card } from "#/components/ui/card";
import { LinkOrDiv } from "#/components/ui/common";
import { Popover, PopoverContent } from "#/components/ui/popover";
import { useToast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";

export function SchoolReportCard({
  name,
  saved,
  savedSession,
  payload: data,
  occurring,
}: {
  name: string;
  saved: boolean;
  savedSession: SessionItem | null;
  payload: OccurrenceData;
  occurring: boolean;
}) {
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const { toast } = useToast();

  const onOccurrenceToggleClick = React.useCallback(async () => {
    const response = await toggleInterventionOccurrence(data);
    if (response) {
      toast({
        title: data.occurred
          ? "Marked as occurring"
          : "Marked as not occurring",
      });
      await revalidateFromClient("/profile/school-report");
    } else {
      toast({
        variant: "destructive",
        title: `Already ${data.occurred ? "occurring" : "not occurring"}`,
      });
    }
  }, [data, toast]);

  const onOccurrenceDateSelect = async (date: Date) => {
    const response = await updateInterventionOccurrenceDate({
      sessionDate: date,
      sessionType: data.sessionType,
      schoolId: data.schoolId,
    });
    setCalendarOpen(false);
    if (response) {
      console.log({ response });
      toast({ title: "Date updated" });
      await revalidateFromClient("/profile/school-report");
    } else {
      toast({
        variant: "destructive",
        title: `Something went wrong`,
      });
    }
  };

  return (
    <Card className="my-4 flex">
      <div className="mt-2 flex items-center px-4 py-2  ">
        <div className="flex h-full items-start">
          <button
            onClick={onOccurrenceToggleClick}
            className={cn(
              "h-6 w-6 rounded-full bg-light-grey",
              occurring ? "bg-muted-green" : "bg-light-grey",
            )}
          >
            <span className="sr-only">
              Mark {occurring ? "Unoccurring" : "Occurring"}
            </span>
          </button>
        </div>
        <div
          className={cn("flex flex-col justify-start", {
            "pointer-events-none": !saved,
          })}
        >
          <LinkOrDiv
            href={
              savedSession
                ? `/profile/school-report/session?type=${savedSession.sessionType}`
                : undefined
            }
          >
            <p
              className={cn("pl-3 text-base font-medium leading-5 text-brand", {
                "text-light-grey": !saved,
              })}
            >
              {name}
            </p>
          </LinkOrDiv>

          <div className="flex items-center justify-start gap-1.5">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={null}
                  className={cn(
                    "my-0 shrink-0 py-0 pl-3 pr-0 text-xs font-normal text-brand",
                    {
                      "pl-3 text-xs font-normal text-brand": data.sessionDate,
                      "text-light-grey": !saved,
                    },
                  )}
                >
                  <span>{format(data.sessionDate, "EEEE, MMM do")}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={data.sessionDate}
                  onSelect={(val) => {
                    if (val) {
                      onOccurrenceDateSelect(val);
                    } else {
                      console.error("No date to set");
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span
              className={cn("h-4 overflow-auto font-light", {
                "text-light-grey": !saved,
                "text-brand": saved,
              })}
            >
              |
            </span>
            <div
              className={cn("text-xs font-normal text-brand", {
                "text-light-grey": !saved,
              })}
            >
              <Timepicker
                time={data.sessionDate}
                onSelect={(date) => {
                  if (date) {
                    onOccurrenceDateSelect(date);
                  } else {
                    console.error("No date to set");
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
