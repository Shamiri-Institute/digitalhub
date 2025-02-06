"use client";

import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { markSessionOccurrence } from "#/app/(platform)/sc/actions";
import { MarkSessionOccurrenceSchema } from "#/app/(platform)/sc/schemas";
import {
  Session,
  SessionsContext,
} from "#/components/common/session/sessions-provider";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "#/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { cn, sessionDisplayName } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isBefore } from "date-fns";
import { usePathname } from "next/navigation";
import React, {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export function MarkSessionOccurrence({
  children,
  id,
  isOpen,
  setIsOpen,
  defaultOccurrence,
}: {
  id?: string;
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  defaultOccurrence?: boolean | null;
}) {
  const pathname = usePathname();
  const { sessions, setSessions } = useContext(SessionsContext);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previousUnmarkedSessions, setPreviousUnmarkedSessions] = useState<
    Session[]
  >([]);

  const form = useForm<z.infer<typeof MarkSessionOccurrenceSchema>>({
    resolver: zodResolver(MarkSessionOccurrenceSchema),
    defaultValues: {
      sessionId: id,
      occurrence: defaultOccurrence ? "attended" : "unmarked",
    },
  });

  useEffect(() => {
    if (isOpen) {
      const activeSession = sessions.find((session) => session.id === id);
      const _previousSessions = activeSession
        ? sessions
            .filter((session) => {
              return (
                isBefore(session.sessionDate, activeSession?.sessionDate) &&
                activeSession.schoolId === session.schoolId &&
                !session.occurred
              );
            })
            .sort((a, b) => {
              return a.sessionDate.getTime() - b.sessionDate.getTime();
            })
        : [];

      setPreviousUnmarkedSessions(_previousSessions);

      form.reset({
        sessionId: id,
        occurrence: defaultOccurrence ? "attended" : "unmarked",
      });
    }
  }, [id, form, isOpen, defaultOccurrence]);

  const onSubmit = () => {
    setIsOpen(false);
    setConfirmDialogOpen(true);
  };

  const onConfirmSubmit = async () => {
    setLoading(true);
    const data = form.getValues();
    const response = await markSessionOccurrence(data);

    if (!response.success) {
      toast({
        description:
          response.message ??
          "Something went wrong during submission, please try again",
      });
      setLoading(false);
      return;
    } else {
      const sessionIndex = sessions.findIndex((session) => {
        return session.id === id;
      });

      const copiedSessions = [...sessions];
      if (
        sessionIndex !== -1 &&
        copiedSessions[sessionIndex] !== undefined &&
        response.data
      ) {
        copiedSessions[sessionIndex].occurred = response.data.occurred;
        setSessions(copiedSessions);
      }
      toast({
        description: response.message,
      });
    }

    await revalidatePageAction(pathname).then(() => {
      setLoading(false);
      setConfirmDialogOpen(false);
      setIsOpen(false);
    });
  };

  return (
    <Form {...form}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-2/5 max-w-none">
          <DialogHeader>
            <h2 className="text-lg font-bold">Mark session occurrence</h2>
          </DialogHeader>
          {children}
          {previousUnmarkedSessions.length === 0 ? (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="occurrence"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Select occurrence</FormLabel>
                    <RadioGroup
                      defaultValue={field.value}
                      value={field.value}
                      name="attended"
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                      className="grid grid-cols-2 gap-2"
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
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col">
                <span>Unmarked sessions found</span>
                <span className="text-muted-foreground">
                  Please mark attendances for the following sessions before
                  proceeding:
                </span>
              </div>
              <div className="flex flex-col gap-2 py-2">
                {previousUnmarkedSessions.map((session, index) => (
                  <div
                    key={index.toString()}
                    className="flex items-center gap-x-2 rounded-lg border bg-background-secondary px-4 py-3"
                  >
                    <span>
                      {sessionDisplayName(session.session?.sessionName)}
                    </span>
                    <span>- {session.school?.schoolName} -</span>
                    <span className="text-muted-foreground">
                      {format(session.sessionDate, "dd/MM/yyyy - h:mm a")}
                    </span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button
                  variant="brand"
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="w-1/3 max-w-none">
          <DialogHeader>
            <span className="text-xl font-bold">Cancel session</span>
          </DialogHeader>
          {children}
          <div className="flex flex-col gap-y-4">
            <Separator />
            <span>Are you sure?</span>
            <div className="flex gap-2 rounded-lg border border-shamiri-red/30 bg-red-bg px-4 py-2 text-red-base">
              <Icons.info className="mt-1 h-4 w-4 shrink-0 stroke-2" />
              <div>
                Once this change has been made it is irreversible and will need
                you to contact support in order to modify. Please be sure of
                your action before you confirm.
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex justify-end gap-4">
            <Button
              className="text-shamiri-light-red hover:bg-red-bg hover:text-shamiri-light-red"
              variant="ghost"
              onClick={() => {
                setConfirmDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={loading}
              loading={loading}
              onClick={() => {
                onConfirmSubmit();
              }}
            >
              Confirm
            </Button>
          </div>
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
