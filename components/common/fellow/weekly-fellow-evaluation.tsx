import CountdownTimer from "#/app/(platform)/hc/components/countdown-timer";
import { SchoolFellowTableData } from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/columns";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { cn, stringValidation } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { addDays, eachWeekOfInterval, format } from "date-fns";
import { parsePhoneNumber } from "libphonenumber-js";
import { usePathname } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const WeeklyFellowEvaluationSchema = z.object({
  week: z.coerce.date({ required_error: "Please select a week" }),
  mode: z.enum(["add", "edit"]),
  fellowId: stringValidation("Fellow ID is required"),
  behaviourNotes: z.string().optional(),
  behaviourRating: z
    .number({ required_error: "Please provide a rating" })
    .min(1),
  programDeliveryNotes: z.string().optional(),
  programDeliveryRating: z
    .number({ required_error: "Please provide a rating" })
    .min(1),
  dressingAndGroomingNotes: z.string().optional(),
  dressingAndGroomingRating: z
    .number({ required_error: "Please provide a rating" })
    .min(1),
  punctualityNotes: z.string().optional(),
  punctualityRating: z
    .number({ required_error: "Please provide a rating" })
    .min(1),
});

export default function WeeklyFellowEvaluation({
  fellow,
  open,
  onOpenChange,
  evaluations,
  project,
}: {
  fellow: SchoolFellowTableData;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  evaluations: Prisma.WeeklyFellowRatingsGetPayload<{
    include: {
      fellow: true;
    };
  }>[];
  project?: Prisma.ProjectGetPayload<{}>;
}) {
  const [existingEvaluation, setExistingEvaluation] = useState<
    Prisma.WeeklyFellowRatingsGetPayload<{}> | undefined
  >();
  const [updateWindowDuration, setUpdateWindowDuration] = useState<number>(0);
  const pathname = usePathname();

  const defaultValues = {
    fellowId: fellow.id,
    mode: "add",
  };

  const form = useForm<z.infer<typeof WeeklyFellowEvaluationSchema>>({
    resolver: zodResolver(WeeklyFellowEvaluationSchema),
    defaultValues,
  });

  const weeks =
    project && project.actualStartDate !== null
      ? eachWeekOfInterval({
          start: project.actualStartDate,
          end: project.actualEndDate ?? new Date(),
        })
      : [];

  const onSubmit = async (
    data: z.infer<typeof WeeklyFellowEvaluationSchema>,
  ) => {
    // const response = await submitMonthlySupervisorEvaluation(data);
    // if (!response.success) {
    //   toast({
    //     description:
    //       response.message ?? "Something went wrong, please try again",
    //   });
    //   return;
    // }
    // toast({
    //   description: response.message,
    // });
    // revalidatePageAction(pathname).then(() => {
    //   onOpenChange(false);
    // });
  };

  useEffect(() => {
    if (!open) {
      setExistingEvaluation(undefined);
      form.reset(defaultValues);
    }
  }, [fellow.id, open]);

  // useEffect(() => {
  //   if (existingEvaluation) {
  //     setUpdateWindowDuration(
  //       differenceInSeconds(
  //         addDays(existingEvaluation.createdAt, 14),
  //         new Date(),
  //       ),
  //     );
  //   }
  // }, [existingEvaluation]);

  // const updateFormValues = (value: string) => {
  //   const match = evaluations.find((evaluation) =>
  //     isEqual(new Date(evaluation.week), new Date(value)),
  //   );
  //
  //   if (match) {
  //     setExistingEvaluation(match);
  //     const { week } = match;
  //     form.reset({
  //       week,
  //     });
  //   } else {
  //     form.reset({ week: new Date(value), ...defaultValues });
  //     setExistingEvaluation(undefined);
  //   }
  // };

  return (
    <Form {...form}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-2/5 max-w-none p-5 text-base font-medium leading-6">
          <DialogHeader>
            <h2 className="text-lg font-bold">Weekly fellow evaluation</h2>
          </DialogHeader>
          <DialogAlertWidget>
            <div className="flex items-center gap-2">
              <span>{fellow.fellowName}</span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                {""}
              </span>
              <span>
                {fellow.cellNumber &&
                  parsePhoneNumber(fellow.cellNumber, "KE").formatNational()}
              </span>
            </div>
          </DialogAlertWidget>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="week"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>
                    Select week{" "}
                    <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(new Date(value));
                      // updateFormValues(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a week" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      {weeks.map((week, index) => {
                        return (
                          <SelectItem
                            key={index.toString()}
                            value={format(week, "yyyy-MM-dd")}
                          >
                            Week {index + 1} - {format(week, "dd MMM yyyy")} to{" "}
                            {format(addDays(week, 6), "dd MMM yyyy")}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {existingEvaluation && updateWindowDuration >= 0 ? (
              <DialogAlertWidget separator={false}>
                <div className="flex items-center gap-2">
                  <span>
                    Update ratings by{" "}
                    {format(
                      addDays(existingEvaluation.createdAt, 14),
                      "dd-MM-yyyy",
                    )}{" "}
                    (
                    <CountdownTimer duration={updateWindowDuration} />)
                  </span>
                </div>
              </DialogAlertWidget>
            ) : null}
            <Separator />
            <div className="flex flex-col space-y-4 text-sm">
              <FormField
                control={form.control}
                name="behaviourRating"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-2">
                    <FormLabel>
                      <span>
                        Rate behaviour (1-unacceptable to 5-outstanding)
                      </span>{" "}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
                    <RatingStarsInput
                      value={field.value}
                      onChange={field.onChange}
                      disabled={
                        existingEvaluation && updateWindowDuration === 0
                      }
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="behaviourNotes"
                disabled={existingEvaluation && updateWindowDuration <= 0}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        className="resize-none"
                        {...field}
                        rows={4}
                        placeholder={
                          existingEvaluation && updateWindowDuration <= 0
                            ? ""
                            : "pertains to evaluating the fellow's demeanor, covering approachability, respectfulness, attitude, collaboration, communication style."
                        }
                      ></Textarea>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="programDeliveryRating"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-2">
                    <FormLabel>
                      <span>
                        Rate program delivery (1-unacceptable to 5-outstanding)
                      </span>{" "}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
                    <RatingStarsInput
                      value={field.value}
                      onChange={field.onChange}
                      disabled={
                        existingEvaluation && updateWindowDuration === 0
                      }
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="programDeliveryNotes"
                disabled={existingEvaluation && updateWindowDuration <= 0}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        className="resize-none"
                        {...field}
                        rows={4}
                        placeholder={
                          existingEvaluation && updateWindowDuration <= 0
                            ? ""
                            : "assesses adherence to protocols, ethical standards, confidentiality, cultural competence"
                        }
                      ></Textarea>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dressingAndGroomingRating"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-2">
                    <FormLabel>
                      <span>
                        Rate dressing and grooming (1-very bad to 5-very good)
                      </span>{" "}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
                    <RatingStarsInput
                      value={field.value}
                      onChange={field.onChange}
                      disabled={
                        existingEvaluation && updateWindowDuration === 0
                      }
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dressingAndGroomingNotes"
                disabled={existingEvaluation && updateWindowDuration <= 0}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        className="resize-none"
                        {...field}
                        rows={4}
                        placeholder={
                          existingEvaluation && updateWindowDuration <= 0
                            ? ""
                            : "assesses the personal presentation of fellows considering appropriate attire and grooming standards in compliance with specific school administration requirements."
                        }
                      ></Textarea>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="punctualityRating"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-2">
                    <FormLabel>
                      <span>
                        Rate session attendance and punctuality (1-very bad to
                        5-very good)
                      </span>{" "}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
                    <RatingStarsInput
                      value={field.value}
                      onChange={field.onChange}
                      disabled={
                        existingEvaluation && updateWindowDuration === 0
                      }
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="punctualityNotes"
                disabled={existingEvaluation && updateWindowDuration <= 0}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        className="resize-none"
                        {...field}
                        rows={4}
                        placeholder={
                          existingEvaluation && updateWindowDuration <= 0
                            ? ""
                            : "assesses the timely arrival and adherence to scheduled program sessions, including supervision and school sessions"
                        }
                      ></Textarea>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {(existingEvaluation === undefined ||
              (existingEvaluation && updateWindowDuration >= 0)) && (
              <div className="space-y-5">
                <Separator />
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
                      (existingEvaluation && updateWindowDuration < 0)
                    }
                    loading={form.formState.isSubmitting}
                  >
                    {existingEvaluation ? "Update & save" : "Submit"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </Form>
  );
}

function RatingStarsInput({
  value,
  onChange,
  disabled = false,
}: {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4",
        disabled ? "pointer-events-none" : "pointer-events-auto",
      )}
    >
      <div className="rating-stars flex flex-row-reverse gap-1 py-2">
        {Array.from(Array(5).keys()).map((index) => {
          return (
            <span
              key={index.toString()}
              className={cn(
                "peer relative h-5 w-5 shrink cursor-pointer transition ease-in hover:text-shamiri-light-orange active:scale-[1.25] peer-hover:text-shamiri-light-orange",
                value && value >= 5 - index
                  ? "text-shamiri-light-orange"
                  : "text-shamiri-light-grey",
              )}
              onClick={() => {
                onChange(5 - index);
              }}
            >
              <Icons.starRating className="h-full w-full" />
            </span>
          );
        })}
      </div>
      <FormMessage />
    </div>
  );
}
