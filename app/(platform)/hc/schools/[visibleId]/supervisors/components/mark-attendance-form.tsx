"use client";
import { MarkSupervisorAttendanceSchema } from "#/app/(platform)/hc/schemas";
import {
  getSessionAndSupervisorAttendances,
  markSupervisorAttendance,
} from "#/app/(platform)/hc/schools/[visibleId]/supervisors/actions";
import { SupervisorInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/context/supervisor-info-context";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
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
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { cn, sessionDisplayName } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { addHours, format } from "date-fns";
import { usePathname } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export function MarkAttendance({
  schoolVisibleId,
}: {
  schoolVisibleId: string;
}) {
  const context = useContext(SupervisorInfoContext);
  const schoolContext = useContext(SchoolInfoContext);
  const [sessions, setSessions] = useState<
    Prisma.InterventionSessionGetPayload<{
      include: {
        supervisorAttendances: true;
      };
    }>[]
  >([]);
  const [activeSession, setActiveSession] = useState<
    Prisma.InterventionSessionGetPayload<{
      include: {
        supervisorAttendances: true;
      };
    }>
  >();
  const pathname = usePathname();

  const form = useForm<z.infer<typeof MarkSupervisorAttendanceSchema>>({
    resolver: zodResolver(MarkSupervisorAttendanceSchema),
  });

  const onSubmit = async (
    data: z.infer<typeof MarkSupervisorAttendanceSchema>,
  ) => {
    if (!context.supervisor) {
      return;
    }
    const attendance = activeSession?.supervisorAttendances.find(
      (attendance) => attendance.supervisorId === context.supervisor?.id,
    );
    if (attendance) {
      const response = await markSupervisorAttendance(attendance.id, data);
      if (!response.success) {
        toast({
          description:
            response.message ??
            "Something went wrong during submission, please try again",
        });
        return;
      }
      toast({
        description: response.message,
      });
      await revalidatePageAction(pathname);
      context.setAttendanceDialog(false);
    }
  };

  function getAttendanceStatus(
    attendance: Prisma.SupervisorAttendanceGetPayload<{}>,
  ) {
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

  function updateActiveSession(sessionId?: string) {
    const activeSession = sessions.find((session) => {
      return session.id === sessionId;
    });
    setActiveSession(activeSession);
  }

  useEffect(() => {
    const attendance = sessions[
      sessions.length - 1
    ]?.supervisorAttendances.find(
      (attendance) => attendance.supervisorId === context.supervisor?.id,
    );

    if (attendance) {
      let status = getAttendanceStatus(attendance);

      form.reset({
        supervisorId: context.supervisor?.id,
        sessionId: sessions[sessions.length - 1]?.id,
        attended: status,
        absenceReason:
          attendance.absenceReason !== null
            ? attendance.absenceReason
            : undefined,
        comments:
          attendance.absenceComments !== null
            ? attendance.absenceComments
            : undefined,
      });
    }
  }, [context.supervisor, context.attendanceDialog, sessions]);

  useEffect(() => {
    updateActiveSession(sessions[sessions.length - 1]?.id);
  }, [sessions]);

  useEffect(() => {
    const attendance = activeSession?.supervisorAttendances.find(
      (attendance) => attendance.supervisorId === context.supervisor?.id,
    );
    if (attendance) {
      const status = getAttendanceStatus(attendance);
      form.setValue("attended", status);
    }
  }, [activeSession]);

  useEffect(() => {
    const fetchAttendances = async () => {
      if (
        context.supervisor !== null &&
        context.supervisor?.hubId &&
        schoolContext.school
      ) {
        const result = await getSessionAndSupervisorAttendances({
          projectId: CURRENT_PROJECT_ID,
          supervisorId: context.supervisor.id,
          schoolId: schoolContext.school?.id,
        });
        if (result.success) {
          setSessions(result.data);
        } else {
          toast({ description: result.message });
        }
      }
    };
    fetchAttendances();
  }, [context.supervisor, schoolVisibleId]);

  const attendanceStatusWatcher = form.watch("attended");
  return (
    <Form {...form}>
      <Dialog
        open={context.attendanceDialog}
        onOpenChange={context.setAttendanceDialog}
      >
        <DialogContent className="w-2/5 max-w-none">
          <DialogHeader>
            <h2 className="text-lg font-bold">Mark supervisor attendance</h2>
          </DialogHeader>
          <DialogAlertWidget>
            <div className="flex items-center gap-2">
              <span>
                {activeSession &&
                  sessionDisplayName(activeSession?.sessionType)}
              </span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                {""}
              </span>
              <span>{context.supervisor?.supervisorName}</span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                {""}
              </span>
              <span>
                {activeSession &&
                  format(new Date(activeSession?.sessionDate), "dd MMM yyyy")}
              </span>
            </div>
          </DialogAlertWidget>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="sessionId"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Select session</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      updateActiveSession(value);
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
                                {sessionDisplayName(session.sessionType)}
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
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Select attendance</FormLabel>
                  <RadioGroup
                    defaultValue={field.value}
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <label
                        htmlFor={"markAttended"}
                        className="custom-radio [&:has(input[type=radio]:checked)]:border-shamiri-green [&:has(input[type=radio]:checked)]:bg-white"
                      >
                        <div className="flex items-center gap-3 pl-6">
                          <RadioGroupItem
                            value="attended"
                            id="markAttended"
                            className="radio data-[state=checked]:border-shamiri-green"
                          ></RadioGroupItem>
                          <span>Attended</span>
                        </div>
                      </label>

                      <label
                        htmlFor={"markMissed"}
                        className="custom-radio [&:has(input[type=radio]:checked)]:border-shamiri-red [&:has(input[type=radio]:checked)]:bg-white"
                      >
                        <div className="flex items-center gap-3 pl-6">
                          <RadioGroupItem
                            value="missed"
                            id="markMissed"
                            className="radio data-[state=checked]:border-shamiri-red"
                          ></RadioGroupItem>
                          <span>Missed</span>
                        </div>
                      </label>

                      <label
                        htmlFor={"Unmarked"}
                        className="custom-radio [&:has(input[type=radio]:checked)]:border-shamiri-new-blue [&:has(input[type=radio]:checked)]:bg-white"
                      >
                        <div className="flex items-center gap-3 pl-6">
                          <RadioGroupItem
                            value="unmarked"
                            id="Unmarked"
                            className="radio data-[state=checked]:border-shamiri-new-blue"
                          ></RadioGroupItem>
                          <span>Unmarked</span>
                        </div>
                      </label>
                    </div>
                  </RadioGroup>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="absenceReason"
              render={({ field }) => (
                <FormItem
                  className={cn(
                    "space-y-2",
                    form.getValues("attended") !== "missed" && "hidden",
                  )}
                >
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
              render={({ field }) => (
                <FormItem
                  className={cn(
                    "space-y-2",
                    form.getValues("attended") !== "missed" && "hidden",
                  )}
                >
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
            <FormField
              control={form.control}
              name="supervisorId"
              render={({ field }) => (
                <FormItem>
                  <Input
                    id="supervisorId"
                    name="supervisorId"
                    type="hidden"
                    value={field.value}
                  />
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
                  context.setAttendanceDialog(false);
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
