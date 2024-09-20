"use client";

import { MarkAttendanceSchema } from "#/app/(platform)/hc/schemas";
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
import { cn, sessionDisplayName } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { addHours, format } from "date-fns";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type Attendance = {
  id: string;
  attendanceId: string;
  sessionId: string;
  schoolId: string | null;
  attended: boolean | null;
  absenceReason: string | null;
  comments?: string; // TODO: Add to all attendances schema
};

export function MarkAttendance({
  schoolId,
  title,
  children,
  sessions,
  attendances,
  id,
  isOpen,
  setIsOpen,
}: {
  schoolId: string | null;
  id: string;
  title: string;
  children: React.ReactNode;
  sessions: Prisma.InterventionSessionGetPayload<{}>[];
  attendances: Attendance[];
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  // const [isOpen, setIsOpen] = useState(false);
  // const [activeSession, setActiveSession] =
  //   useState<Prisma.InterventionSessionGetPayload<{}>>();
  const [loading, setLoading] = useState(false);
  // const pathname = usePathname();

  const form = useForm<z.infer<typeof MarkAttendanceSchema>>({
    resolver: zodResolver(MarkAttendanceSchema),
    defaultValues: getDefaultValues(),
  });

  function getDefaultValues() {
    const defaultSession = sessions[sessions.length - 1]?.id;
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
      // comments: defaultAttendance.comments,
    };
  }

  useEffect(() => {
    form.reset(getDefaultValues());
  }, [sessions, id, form, isOpen, attendances]);

  const statusWatcher = form.watch("attended");

  const onSubmit = async (data: z.infer<typeof MarkAttendanceSchema>) => {
    const { id, absenceReason, sessionId } = data;
    const attendance =
      data.attended === "attended"
        ? true
        : data.attended === "missed"
          ? false
          : null;
    console.log({
      id,
      absenceReason,
      sessionId,
      attended: attendance,
    });
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

  // function updateActiveSession(sessionId?: string) {
  //   // const activeSession = sessions.find((session) => {
  //   //   return session.id === sessionId;
  //   // });
  //   // setActiveSession(activeSession);
  //   console.log(sessionId);
  // }

  // useEffect(() => {
  //   if (batchMode && schoolContext.school !== null) {
  //     const ids = selectedSupervisors
  //       .map((supervisor) => supervisor.id)
  //       .join(",");
  //     const _sessions = schoolContext.school.interventionSessions.filter(
  //       (session) => session.occurred,
  //     );
  //     form.reset({
  //       supervisorId: ids,
  //       sessionId: _sessions[_sessions.length - 1]?.id,
  //     });
  //   } else {
  //     const attendance = sessions[
  //       sessions.length - 1
  //     ]?.supervisorAttendances.find(
  //       (attendance) => attendance.supervisorId === context.supervisor?.id,
  //     );
  //
  //     if (attendance) {
  //       let status = getAttendanceStatus(attendance);
  //
  //       form.reset({
  //         supervisorId: context.supervisor?.id,
  //         sessionId: sessions[sessions.length - 1]?.id,
  //         attended: status,
  //         absenceReason:
  //           attendance.absenceReason !== null
  //             ? attendance.absenceReason
  //             : undefined,
  //         comments:
  //           attendance.absenceComments !== null
  //             ? attendance.absenceComments
  //             : undefined,
  //       });
  //     }
  //   }
  // }, [context.attendanceDialog, sessions, schoolContext.school]);

  // useEffect(() => {
  //   if (!batchMode) {
  //     const attendance = activeSession?.supervisorAttendances.find(
  //       (attendance) => attendance.supervisorId === context.supervisor?.id,
  //     );
  //     if (attendance) {
  //       const status = getAttendanceStatus(attendance);
  //       form.setValue("attended", status);
  //     }
  //   }
  // }, [activeSession, context.supervisor?.id, form]);

  // useEffect(() => {
  //   if (!batchMode && context.attendanceDialog) {
  //     const fetchAttendances = async () => {
  //       setLoading(true);
  //       if (
  //         context.supervisor !== null &&
  //         context.supervisor?.hubId &&
  //         schoolContext.school
  //       ) {
  //         const result = await getSessionAndSupervisorAttendances({
  //           projectId: CURRENT_PROJECT_ID,
  //           supervisorId: context.supervisor.id,
  //           schoolId: schoolContext.school?.id,
  //         });
  //         if (result.success) {
  //           setSessions(result.data);
  //         } else {
  //           toast({ description: result.message });
  //         }
  //         setLoading(false);
  //       }
  //     };
  //     fetchAttendances();
  //   }
  // }, [context.attendanceDialog, batchMode]);

  return (
    <Form {...form}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-2/5 max-w-none">
          <DialogHeader>
            <h2 className="text-lg font-bold">{title}</h2>
          </DialogHeader>
          {children}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="sessionId"
              disabled={loading}
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Select session</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // updateActiveSession(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a session" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sessions.map((session) => {
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
            <FormField
              control={form.control}
              name="attended"
              disabled={loading}
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
                  disabled={loading}
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
                          {/*TODO: Update absence reasons for supervisors*/}
                          {["Health issues"].map((reason) => {
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
                  disabled={loading}
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
