"use client";

import CountdownTimer from "#/app/(platform)/hc/components/countdown-timer";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import RatingStarsInput from "#/components/common/rating-stars-input";
import { SessionRatingsSchema } from "#/components/common/session/schema";
import { SessionsContext } from "#/components/common/session/sessions-provider";
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
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { submitSessionRatings } from "#/lib/actions/session/session";
import { cn, sessionDisplayName } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImplementerRole, Prisma } from "@prisma/client";
import { addDays, addHours, differenceInSeconds, format } from "date-fns";
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
import { Session } from "./sessions-provider";
export { useSession } from "next-auth/react";

type FormInput = {
  section: string;
  description?: string;
  fields: {
    label?: string;
    name: string;
  }[];
  commentsInputName: string;
};

export default function SessionRatings({
  selectedSession,
  open,
  onOpenChange,
  mode,
  children,
  supervisorId,
  supervisors,
  role,
}: {
  selectedSession: Session;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  mode?: "view" | "add";
  children: React.ReactNode;
  supervisorId?: string;
  role: ImplementerRole;
  supervisors?: Prisma.SupervisorGetPayload<{
    include: {
      supervisorAttendances: {
        include: {
          session: true;
        };
      };
      fellows: {
        include: {
          fellowAttendances: true;
          groups: true;
        };
      };
      assignedSchools: true;
    };
  }>[];
}) {
  const { refresh } = useContext(SessionsContext);
  const sessionRatings = selectedSession.sessionRatings;
  const rating =
    role === "SUPERVISOR"
      ? sessionRatings.find((_rating) => {
          return _rating.supervisorId === supervisorId;
        })
      : role === "HUB_COORDINATOR"
        ? sessionRatings[0]
        : undefined;
  const [existingRating, setExistingRating] = useState<
    Prisma.InterventionSessionRatingGetPayload<{}> | undefined
  >(rating);
  const [updateWindowDuration, setUpdateWindowDuration] = useState<number>(0);
  const pathname = usePathname();

  const form = useForm<z.infer<typeof SessionRatingsSchema>>({
    resolver: zodResolver(SessionRatingsSchema),
    defaultValues: getDefaultValues(),
  });

  function getDefaultValues() {
    return {
      mode,
      ratingId: rating?.id,
      sessionId: selectedSession.id,
      studentBehaviorRating: existingRating?.studentBehaviorRating ?? undefined,
      adminSupportRating: existingRating?.adminSupportRating ?? undefined,
      workloadRating: existingRating?.workloadRating ?? undefined,
      recommendations: existingRating?.recommendations ?? "",
      challenges: existingRating?.challenges ?? "",
      positiveHighlights: existingRating?.positiveHighlights ?? "",
      headcount: existingRating?.headcount ?? undefined,
    };
  }

  useEffect(() => {
    form.reset(getDefaultValues());
    if (existingRating) {
      setUpdateWindowDuration(
        differenceInSeconds(addDays(existingRating.createdAt, 14), new Date()),
      );
    }
  }, [existingRating, open, form]);

  useEffect(() => {
    setExistingRating(rating);
  }, [open, rating]);

  const onSubmit = async (data: z.infer<typeof SessionRatingsSchema>) => {
    const response = await submitSessionRatings(data);
    if (!response.success) {
      toast({
        variant: "destructive",
        description:
          response.message ??
          "Something went wrong during submission, please try again",
      });
      return;
    }

    await refresh();
    await revalidatePageAction(pathname);
    toast({
      description: response.message,
    });
    form.reset();
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-2/5 max-w-none p-5 text-base font-medium leading-6">
        <DialogHeader>
          <h2 className="text-xl font-bold">Weekly session report</h2>
        </DialogHeader>
        {children}
        {mode === "view" && sessionRatings.length === 0 ? (
          <div className="space-y-3">
            <div className="item-center flex justify-center text-shamiri-text-dark-grey">
              No reports found.
            </div>
            <Separator />
            <DialogFooter className="flex justify-end">
              <Button
                className=""
                variant="brand"
                type="button"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className={cn(
                "space-y-5",
                mode === "view" ? "form-view-mode" : "",
              )}
            >
              {mode === "view" && (
                <FormField
                  control={form.control}
                  name="ratingId"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>
                        Select session {mode === "view" && " report"}
                        <span className="ml-1 text-shamiri-light-red">*</span>
                      </FormLabel>{" "}
                      <Select
                        defaultValue={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          const match = sessionRatings.find((_rating) => {
                            return _rating.id === value;
                          });
                          setExistingRating(match);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a session" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[200px]">
                          {sessionRatings.map((_rating) => {
                            return (
                              <SelectItem key={_rating.id} value={_rating.id}>
                                <span>
                                  {sessionDisplayName(
                                    selectedSession?.session?.sessionName,
                                  )}
                                </span>{" "}
                                -{" "}
                                <span>
                                  {selectedSession?.sessionDate &&
                                    format(
                                      selectedSession?.sessionDate,
                                      "dd MMM yyyy",
                                    )}
                                </span>{" "}
                                -{" "}
                                <span>
                                  {selectedSession?.sessionDate &&
                                    format(
                                      selectedSession?.sessionDate,
                                      "h:mm a",
                                    )}
                                </span>{" "}
                                -{" "}
                                <span>
                                  {selectedSession?.sessionDate &&
                                    format(
                                      selectedSession?.sessionEndTime ??
                                        addHours(
                                          selectedSession?.sessionDate,
                                          1,
                                        ),
                                      "h:mm a",
                                    )}
                                </span>
                                {role === "HUB_COORDINATOR" ? (
                                  <span>
                                    {" "}
                                    -{" "}
                                    {
                                      supervisors?.find(
                                        (supervisor) =>
                                          supervisor.id ===
                                          _rating?.supervisorId,
                                      )?.supervisorName
                                    }
                                  </span>
                                ) : null}
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
              <div className="flex flex-col gap-4 divide-y">
                <div className="flex flex-col space-y-3 pt-4 text-sm">
                  <FormField
                    control={form.control}
                    name="headcount"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Student headcount</FormLabel>
                        <Input
                          type="number"
                          placeholder="No of. students who attended"
                          disabled={
                            mode === "view" ||
                            (existingRating && updateWindowDuration < 0)
                          }
                          {...field}
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value);
                            field.onChange(value);
                          }}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex flex-col space-y-3 pt-4 text-sm">
                  <FormField
                    control={form.control}
                    name="studentBehaviorRating"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-2">
                        <FormLabel>
                          Student behaviour (1-unacceptable to 5-outstanding){" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <RatingStarsInput
                          value={field.value}
                          onChange={field.onChange}
                          disabled={
                            mode === "view" ||
                            (existingRating && updateWindowDuration < 0)
                          }
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adminSupportRating"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-2">
                        <FormLabel>
                          Admin support (1-unacceptable to 5-outstanding){" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <RatingStarsInput
                          value={field.value}
                          onChange={field.onChange}
                          disabled={
                            mode === "view" ||
                            (existingRating && updateWindowDuration < 0)
                          }
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workloadRating"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-2">
                        <FormLabel>
                          Workload (1-unacceptable to 5-outstanding){" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <RatingStarsInput
                          value={field.value}
                          onChange={field.onChange}
                          disabled={
                            mode === "view" ||
                            (existingRating && updateWindowDuration < 0)
                          }
                        />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex flex-col space-y-3 pt-4 text-sm">
                  <FormField
                    control={form.control}
                    name="positiveHighlights"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Positive Highlights"
                            className="resize-none"
                            rows={4}
                            disabled={
                              mode === "view" ||
                              (existingRating && updateWindowDuration < 0)
                            }
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="challenges"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormControl>
                          <Textarea
                            placeholder="Challenges"
                            className="resize-none"
                            rows={4}
                            disabled={
                              mode === "view" ||
                              (existingRating && updateWindowDuration < 0)
                            }
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="recommendations"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormControl>
                          <Textarea
                            placeholder="Recommendations"
                            className="resize-none"
                            rows={4}
                            disabled={
                              mode === "view" ||
                              (existingRating && updateWindowDuration < 0)
                            }
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <Separator />
              {mode !== "view" &&
              (existingRating === undefined ||
                (existingRating && updateWindowDuration > 0)) ? (
                <div className="space-y-5">
                  {existingRating && updateWindowDuration > 0 && (
                    <>
                      <DialogAlertWidget separator={false}>
                        <div className="flex items-center gap-2">
                          <span>
                            Update ratings by{" "}
                            {existingRating &&
                              format(
                                addDays(existingRating.createdAt, 14),
                                "dd-MM-yyyy",
                              )}{" "}
                            (
                            <CountdownTimer duration={updateWindowDuration} />)
                          </span>
                        </div>
                      </DialogAlertWidget>
                      <Separator />
                    </>
                  )}
                  <DialogFooter className="flex justify-end">
                    <Button
                      className=""
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="brand"
                      type="submit"
                      disabled={
                        form.formState.isSubmitting ||
                        (existingRating && updateWindowDuration < 0)
                      }
                      loading={form.formState.isSubmitting}
                    >
                      {existingRating ? "Update & save" : "Submit"}
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <DialogFooter className="flex justify-end">
                  <Button
                    className=""
                    variant="brand"
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                    }}
                  >
                    Done
                  </Button>
                </DialogFooter>
              )}
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
