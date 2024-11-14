"use client";

import { MarkAttendanceSchema } from "#/app/(platform)/hc/schemas";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { cn, sessionDisplayName } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { addHours, format } from "date-fns";
import { usePathname } from "next/navigation";
import React, { Dispatch, SetStateAction, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type Attendance = {
  id: string;
  attendanceId: string;
  sessionId: string;
  schoolId: string | null;
  attended: boolean | null;
  absenceReason: string | null;
  comments?: string | null;
};

export function MarkAttendance({
  title,
  children,
  sessions,
  attendances,
  id,
  isOpen,
  setIsOpen,
  markAttendanceAction,
  markBulkAttendanceAction,
  selectedSessionId,
  sessionMode = "many",
  bulkMode = false,
  toggleBulkMode,
  selectedIds,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
  sessions?: Prisma.InterventionSessionGetPayload<{}>[];
  attendances: Attendance[];
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  markAttendanceAction: (
    data: z.infer<typeof MarkAttendanceSchema>,
  ) => Promise<{
    success: boolean;
    message: string;
  }>;
  markBulkAttendanceAction: (
    ids: string[],
    data: z.infer<typeof MarkAttendanceSchema>,
  ) => Promise<{
    success: boolean;
    message: string;
  }>;
  selectedSessionId?: string;
  sessionMode?: "single" | "many";
  bulkMode: boolean;
  toggleBulkMode: Dispatch<SetStateAction<boolean>>;
  selectedIds: string[];
}) {
  const pathname = usePathname();

  const form = useForm<z.infer<typeof MarkAttendanceSchema>>({
    resolver: zodResolver(MarkAttendanceSchema),
    defaultValues: getDefaultValues(),
  });

  const statusWatcher = form.watch("attended");
  const sessionIdWatcher = form.watch("sessionId");

  function getDefaultValues(sessionId?: string) {
    const defaultSession = sessionId
      ? sessionId
      : sessions
        ? sessions[sessions.length - 1]?.id
        : undefined;
    const defaultAttendance = attendances.find((attendance) => {
      return attendance.sessionId === defaultSession;
    });
    return {
      sessionId: defaultSession,
      id,
      attended: defaultAttendance
        ? getAttendanceStatus(defaultAttendance)
        : "unmarked",
      absenceReason: defaultAttendance?.absenceReason ?? undefined,
      comments: defaultAttendance?.comments ?? undefined,
      bulkMode,
    };
  }

  useEffect(() => {
    form.reset(getDefaultValues(sessionIdWatcher));
    if (!isOpen) {
      toggleBulkMode(false);
    }
  }, [sessions, id, form, isOpen, attendances, sessionIdWatcher]);

  useEffect(() => {
    form.reset(getDefaultValues(selectedSessionId));
  }, [selectedSessionId]);

  useEffect(() => {
    form.setValue("comments", undefined);
    form.setValue("absenceReason", undefined);
  }, [statusWatcher]);

  const onSubmit = async (data: z.infer<typeof MarkAttendanceSchema>) => {
    let response;
    if (bulkMode) {
      response = await markBulkAttendanceAction(selectedIds, data);
    } else {
      response = await markAttendanceAction(data);
    }
    if (!response.success) {
      toast({
        description:
          response.message ??
          "Something went wrong during submission, please try again",
      });
      return;
    } else {
      toast({
        description: response.message,
      });
    }

    await revalidatePageAction(pathname);
    setIsOpen(false);
  };

  function getAttendanceStatus(attendance: Attendance) {
    let status: "attended" | "missed" | "unmarked";
    if (attendance?.attended) {
      status = "attended";
    } else if (attendance?.attended === false) {
      status = "missed";
    } else {
      status = "unmarked";
    }

    return status;
  }

  return (
    <Form {...form}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-2/5 max-w-none">
          <DialogHeader>
            <h2 className="text-lg font-bold">{title}</h2>
          </DialogHeader>
          {children}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {sessionMode === "many" && (
              <FormField
                control={form.control}
                name="sessionId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Select session</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a session" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sessions?.map((session) => {
                          const time = `${format(session.sessionDate, "h:mm")} - ${format(
                            session.sessionEndTime ??
                              addHours(session.sessionDate, 1.5),
                            "h:mm a",
                          )}`;
                          return (
                            <SelectItem key={session.id} value={session.id}>
                              <div className="flex items-center gap-2">
                                <span>
                                  {sessionDisplayName(session.sessionType!)}
                                </span>
                                <span>-</span>
                                <span>
                                  {format(
                                    new Date(session.sessionDate),
                                    "dd MMM yyyy",
                                  )}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-black"></span>
                                <span>{time}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="attended"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Select attendance</FormLabel>
                  <RadioGroup
                    defaultValue={field.value}
                    value={field.value}
                    name="attended"
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                    className="grid grid-cols-3 gap-2"
                  >
                    <div className="relative">
                      <CustomIndicator className="green" label={"Attended"} />
                      <RadioGroupItem
                        value="attended"
                        id="mark_attended"
                        className="custom-radio border-gray-300 data-[state=checked]:border-shamiri-green"
                      ></RadioGroupItem>
                    </div>
                    <div className="relative">
                      <CustomIndicator className="red" label={"Missed"} />
                      <RadioGroupItem
                        value="missed"
                        id="mark_missed"
                        className="custom-radio border-gray-300  data-[state=checked]:border-shamiri-red"
                      ></RadioGroupItem>
                    </div>
                    <div className="relative">
                      <CustomIndicator className="blue" label={"Unmarked"} />
                      <RadioGroupItem
                        value="unmarked"
                        id="Unmarked_"
                        className="custom-radio border-gray-300  data-[state=checked]:border-shamiri-new-blue"
                      ></RadioGroupItem>
                    </div>
                  </RadioGroup>
                  <FormMessage />
                </FormItem>
              )}
            />
            {statusWatcher === "missed" && (
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="absenceReason"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Select reason for above</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[
                            "School fees",
                            "Sickness",
                            "Suspension",
                            "School transfer",
                            "Group transfer",
                            "Other priorities",
                            "Mistrust",
                            "Other reason",
                          ].map((reason) => {
                            return (
                              <SelectItem key={reason} value={reason}>
                                {reason}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="comments"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Additional comments</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder=""
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <Input id="id" name="id" type="hidden" value={field.value} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <DialogFooter className="flex justify-end">
              <Button
                className="text-shamiri-new-blue hover:bg-blue-bg"
                variant="ghost"
                onClick={() => {
                  setIsOpen(false);
                }}
                type="button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                loading={form.formState.isSubmitting}
              >
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Form>
  );
}

function CustomIndicator({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <div className="custom-indicator pointer-events-none absolute inset-0 flex h-20 items-center pl-6">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "indicator h-4 w-4 rounded-full border border-gray-300 bg-white shadow",
            className,
          )}
        ></div>
        <span>{label}</span>
      </div>
    </div>
  );
}
