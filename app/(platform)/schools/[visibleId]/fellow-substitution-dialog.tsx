"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { substituteFellowForAttendance } from "#/app/(platform)/schools/[visibleId]/actions";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Form, FormField } from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { fetchFellowAttendances } from "#/lib/actions/fetch-fellow-attendances";
import { fetchFellows } from "#/lib/actions/fetch-fellows";
import { fetchSupervisors } from "#/lib/actions/fetch-supervisors";
import { notEmpty } from "#/lib/utils";
import { constants } from "#/tests/constants";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import React from "react";

const FormSchema = z.object({
  attendanceId: z.string({
    required_error: "Please select the session to reschedule.",
  }),
  supervisorId: z.string({
    required_error: "Please select the supervisor to reschedule.",
  }),
  fellowId: z.string({
    required_error: "Please select the fellow to reschedule.",
  }),
});

export function FellowSubstitutionDialog({
  fellow,
  children,
  close,
}: {
  fellow: Prisma.FellowGetPayload<{}>;
  children: React.ReactNode;
  close: () => void;
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const response = await substituteFellowForAttendance({
      attendanceId: parseInt(data.attendanceId),
      fellowId: data.fellowId,
    });

    if (response?.error) {
      toast({
        title: "Error",
        description: response.error,
      });
    } else if (response?.success) {
      toast({
        title: "Success",
        description: "Fellow has been successfully substituted",
      });

      close();
    }
  }

  const [fellowInterventionSessions, setFellowInterventionSessions] =
    React.useState<
      (Prisma.InterventionSessionGetPayload<{}> & {
        fellowAttendanceId: number;
      })[]
    >([]);

  React.useEffect(() => {
    async function initFellowAttendances() {
      const fellowAttendances = await fetchFellowAttendances({
        where: {
          fellowId: fellow.id,
        },
      });
      const fellowSessions = fellowAttendances
        .map((attendance) => attendance.session)
        .filter(notEmpty)
        .map((session) => ({
          ...session,
          fellowAttendanceId: fellowAttendances.find(
            (attendance) => attendance.sessionId === session.id,
          )?.id!,
        }));

      setFellowInterventionSessions(fellowSessions);
    }

    initFellowAttendances();
  }, [fellow.id]);

  const [supervisors, setSupervisors] =
    React.useState<Prisma.SupervisorGetPayload<{}>[]>();
  const [selectedSupervisorId, setSelectedSupervisorId] =
    React.useState<string>();

  React.useEffect(() => {
    async function initSupervisors() {
      const supervisors = await fetchSupervisors({
        where: {
          assignedSchools: {
            some: {
              hubId: fellow.hubId,
            },
          },
        },
      });
      setSupervisors(supervisors);
    }

    initSupervisors();
  }, [fellow.hubId]);

  const [fellows, setFellows] = React.useState<Prisma.FellowGetPayload<{}>[]>();

  React.useEffect(() => {
    async function initFellows() {
      if (selectedSupervisorId) {
        const fellows = await fetchFellows({
          where: {
            supervisorId: selectedSupervisorId,
          },
        });
        setFellows(fellows);
      }
    }

    initFellows();
  }, [selectedSupervisorId]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="overflow-hidden text-ellipsis"
          >
            <DialogHeader className="space-y-0 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-medium">
                  Submit substitute for {fellow.fellowName?.trim()}&apos;
                  {"s "}
                  session
                </span>
              </div>
            </DialogHeader>
            <Separator />
            <div className="my-6 space-y-6">
              <div className="px-4">
                <FormField
                  control={form.control}
                  name="attendanceId"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="attendanceId">Session</Label>
                      <Select
                        name="attendanceId"
                        defaultValue={field.value?.toString()}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">
                                Select session
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {fellowInterventionSessions.map((session) => (
                            <SelectItem
                              key={session.fellowAttendanceId}
                              value={session.fellowAttendanceId?.toString()}
                            >
                              {session.sessionName} -{" "}
                              {format(session.sessionDate, "dd/MM/yyyy")}
                            </SelectItem>
                          ))}
                          {!fellowInterventionSessions.length && (
                            <SelectItem value="no-sessions" disabled>
                              No sessions found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>
              <div className="px-4">
                <FormField
                  control={form.control}
                  name="supervisorId"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="supervisorId">Supervisor</Label>
                      <Select
                        name="supervisorId"
                        defaultValue={field.value}
                        onValueChange={(supervisorId) => {
                          setSelectedSupervisorId(supervisorId);
                          field.onChange(supervisorId);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">
                                Select supervisor
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {supervisors?.map((supervisor) => (
                            <SelectItem
                              key={supervisor.id}
                              value={supervisor.id}
                            >
                              {supervisor.supervisorName} -{" "}
                              {supervisor.visibleId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>
              <div className="px-4">
                <FormField
                  control={form.control}
                  name="fellowId"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="fellowId">Replacement Fellow</Label>
                      <Select
                        name="fellowId"
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">
                                Select fellow
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {fellows?.map((fellow) => (
                            <SelectItem key={fellow.id} value={fellow.id}>
                              {fellow.fellowName} - {fellow.visibleId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end px-6 pb-6">
              <Button
                variant="destructive"
                type="submit"
                data-testid={constants.ADD_MEMBERS_SUBMIT}
                className="w-full bg-[#AC2925]"
              >
                Submit
              </Button>
            </div>
            {Object.keys(form.formState.errors).length > 0 && (
              <div
                className="relative rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-500"
                role="alert"
              >
                <strong className="font-bold">
                  Please correct the following errors:
                </strong>
                <ul className="list-inside list-disc">
                  {Object.entries(form.formState.errors).map(([key, value]) => (
                    <li key={key}>
                      {key}: {value.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
