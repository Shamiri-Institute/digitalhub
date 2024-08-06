"use client";
import { MarkSupervisorAttendanceSchema } from "#/app/(platform)/hc/schemas";
import { getSessionAndSupervisorAttendances } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/actions";
import { SupervisorInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/context/supervisor-info-context";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { sessionDisplayName } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { addHours, format } from "date-fns";
import { parsePhoneNumber } from "libphonenumber-js";
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export function MarkAttendance({
  schoolVisibleId,
}: {
  schoolVisibleId: string;
}) {
  const context = useContext(SupervisorInfoContext);
  const [sessions, setSessions] = useState<
    Prisma.InterventionSessionGetPayload<{
      include: {
        supervisorAttendances: true;
      };
    }>[]
  >([]);

  const form = useForm<z.infer<typeof MarkSupervisorAttendanceSchema>>({
    resolver: zodResolver(MarkSupervisorAttendanceSchema),
    defaultValues: {
      // sessionId: sessions.find((session) => {
      //   return session.
      // })
    },
  });

  const onSubmit = (data: z.infer<typeof MarkSupervisorAttendanceSchema>) => {
    if (!context.supervisor) {
      return;
    }
    context.setDropoutDialog(false);
  };

  // useEffect(() => {
  //   form.reset({
  //     supervisorId: context.supervisor?.id,
  //   });
  // }, [context.supervisor?.id, context.dropoutDialog, form]);

  useEffect(() => {
    const fetchAttendances = async () => {
      if (context.supervisor !== null && context.supervisor?.hubId) {
        const result = await getSessionAndSupervisorAttendances({
          projectId: CURRENT_PROJECT_ID,
          supervisorId: context.supervisor.id,
          schoolVisibleId,
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

  useEffect(() => {
    console.log(sessions);
  }, [sessions]);

  return (
    <Form {...form}>
      <Dialog
        open={context.dropoutDialog}
        onOpenChange={context.setDropoutDialog}
      >
        <DialogContent className="p-5 text-base font-medium leading-6">
          <DialogHeader>
            <h2 className="text-lg font-bold">Mark supervisor attendance</h2>
          </DialogHeader>
          <DialogAlertWidget>
            <div className="flex items-center gap-2">
              <span>{context.supervisor?.supervisorName}</span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                {""}
              </span>
              <span>
                {context.supervisor?.cellNumber &&
                  parsePhoneNumber(
                    context.supervisor?.cellNumber,
                    "KE",
                  ).formatNational()}
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
                  <Select onValueChange={field.onChange}>
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
                className="text-shamiri-light-red hover:bg-red-bg"
                variant="ghost"
                onClick={() => {
                  context.setDropoutDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
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
