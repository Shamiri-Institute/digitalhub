"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import Link from "next/link";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Timepicker } from "#/app/(platform)/profile/school-report/timepicker";
import {
  OccurrenceData,
  revalidateFromClient,
  toggleInterventionOccurrence,
} from "#/app/actions";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Card } from "#/components/ui/card";
import { FormField } from "#/components/ui/form";
import { Popover, PopoverContent } from "#/components/ui/popover";
import { useToast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";

const FormSchema = z.object({
  dateOfSession: z.date({
    required_error: "Please enter the fellow's date of session.",
  }),
});

export function SchoolReportCard({
  name,
  saved,
  payload: data,
  occurring,
}: {
  name: string;
  saved: boolean;
  payload: OccurrenceData;
  occurring: boolean;
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });
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
  }, [occurring]);

  const [stateDate, setStateDate] = React.useState<Date>(data.sessionDate);

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
        <div className="flex flex-col justify-start">
          {/* Adjust url to /profile/school-report/session?id={name} */}
          <Link href={`/profile/school-report/${name}`}>
            <p
              className={cn("pl-3 text-base font-medium leading-5 text-brand", {
                "text-light-grey": !saved,
              })}
            >
              {name}
            </p>
          </Link>

          <div className="flex items-center justify-start gap-1.5">
            <FormField
              control={form.control}
              name="dateOfSession"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={null}
                      className={cn(
                        "my-0 shrink-0 py-0 pl-3 pr-0 text-xs font-normal text-brand",
                        {
                          "pl-3 text-xs font-normal text-brand": !field.value,
                          "text-light-grey": !saved,
                        },
                      )}
                    >
                      {field.value ? (
                        format(field.value, "EEEE, MMM do")
                      ) : (
                        <span>{format(data.sessionDate, "EEEE, MMM do")}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
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
              <Timepicker time={stateDate} onSelect={setStateDate} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
