"use client";
import { editWeeklyFellowRating } from "#/app/actions";
import { Icons } from "#/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
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
import { Table, TableBody, TableCell, TableRow } from "#/components/ui/table";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { WeeklyFellowRatings } from "@prisma/client";
import { endOfWeek, format, startOfWeek, subWeeks } from "date-fns";
import { Loader2 } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { submitWeeklyFellowRating } from "../../actions";
import { WeeklyFellowRatingSchema } from "../../schemas";

function generateWeekFieldValues() {
  const numWeeks = 4;

  let selectValues = [];
  const today = new Date();

  for (let i = numWeeks; i >= 0; i--) {
    const date = subWeeks(today, i);
    const week = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    selectValues.push(
      <SelectItem value={format(week, "yyyy-MM-dd")}>
        Week {numWeeks - i + 1} - {format(week, "dd MMM yyyy")} to{" "}
        {format(weekEnd, "dd MMM yyyy")}
      </SelectItem>,
    );
  }

  return selectValues;
}

const InputSchema = WeeklyFellowRatingSchema.pick({
  programDeliveryNotes: true,
  dressingAndGroomingNotes: true,
  punctualityNotes: true,
  behaviourNotes: true,
  week: true,
  behaviourRating: true,
  programDeliveryRating: true,
  dressingAndGroomingRating: true,
  punctualityRating: true,
});

export default function WeeklyEvaluationForm({
  children,
  previousRatings = [],
  fellowId,
}: {
  children: React.ReactNode;
  previousRatings: WeeklyFellowRatings[];
  fellowId: string;
}) {
  const [open, setDialogOpen] = React.useState<boolean>(false);

  const form = useForm<z.infer<typeof InputSchema>>({
    resolver: zodResolver(InputSchema),
    defaultValues: {
      programDeliveryNotes: "",
      dressingAndGroomingNotes: "",
      punctualityNotes: "",
      behaviourNotes: "",
      behaviourRating: 0,
      programDeliveryRating: 0,
      dressingAndGroomingRating: 0,
      punctualityRating: 0,
    },
  });

  async function onSubmit(data: z.infer<typeof InputSchema>) {
    const weeklyRatingBody = {
      ...data,
      fellowId,
    };

    const response = await submitWeeklyFellowRating(weeklyRatingBody);

    if (!response.success) {
      toast({
        variant: "destructive",
        title: "Submission error",
        description:
          response.message ??
          "Something went wrong during submission, please try again",
      });
      return;
    }

    toast({
      variant: "default",
      title: "Success",
      description: "Successfully submitted weekly evaluation",
    });

    form.reset();
    setDialogOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="overflow-hidden text-ellipsis"
          >
            <DialogHeader className="space-y-0 px-6 py-4">
              <h2>Submit Weekly fellow evaluation</h2>
            </DialogHeader>
            <Separator />
            <div className="my-6 space-y-6">
              <div className="px-6">
                <FormField
                  control={form.control}
                  name="week"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Week</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        /*
                        // @ts-ignore */
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a week" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {generateWeekFieldValues()}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 px-6">
                <FormLabel>
                  Fellow Behaviour (1-unacceptable to 5-outstanding)
                </FormLabel>
                <FormField
                  control={form.control}
                  name="behaviourRating"
                  render={({ field: { value, onChange } }) => (
                    <FormItem>
                      <RatingStars
                        onSelect={(rating) => onChange(rating)}
                        rating={value}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="behaviourNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-4 px-6">
                <FormLabel>
                  Program Delivery (1-unacceptable to 5-outstanding)
                </FormLabel>
                <FormField
                  control={form.control}
                  name="programDeliveryRating"
                  render={({ field: { value, onChange } }) => (
                    <FormItem>
                      <RatingStars
                        onSelect={(rating) => onChange(rating)}
                        rating={value}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="programDeliveryNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 px-6">
                <FormLabel>
                  Dressing and Grooming (1-unacceptable to 5-outstanding)
                </FormLabel>
                <FormField
                  control={form.control}
                  name="dressingAndGroomingRating"
                  render={({ field: { value, onChange } }) => (
                    <FormItem>
                      <RatingStars
                        onSelect={(rating) => onChange(rating)}
                        rating={value}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dressingAndGroomingNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 px-6">
                <FormLabel>
                  Punctuality (1-unacceptable to 5-outstanding)
                </FormLabel>
                <FormField
                  control={form.control}
                  name="punctualityRating"
                  render={({ field: { value, onChange } }) => (
                    <FormItem>
                      <RatingStars
                        onSelect={(rating) => onChange(rating)}
                        rating={value}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  // todo: update this name on the schema as well
                  name="punctualityNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end px-6 py-6">
              <Button
                disabled={form.formState.isSubmitting}
                variant="brand"
                type="submit"
                className="w-full"
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save
              </Button>
            </div>
          </form>
        </Form>
        <div className="p-6">
          <h2 className="font-medium text-shamiri-dark-blue">
            Past Weekly Evaluations
          </h2>
          {previousRatings?.length ? (
            <Accordion type="single" collapsible className="mt-2 w-full">
              {previousRatings.map((pr) => (
                <RenderPastWeeklyEvaluations key={pr.id} previousRatings={pr} />
              ))}
            </Accordion>
          ) : (
            <div>No Weekly Evaluations Done</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RatingStars({
  rating,
  onSelect,
}: {
  rating: number;
  onSelect: (rating: number) => void;
}) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((i) => {
        if (i <= rating) {
          return (
            <button type="button" key={i} onClick={() => onSelect(i)}>
              <Icons.star
                key={i}
                className="h-6 w-6 align-baseline text-muted-yellow"
              />
            </button>
          );
        }

        return (
          <button type="button" key={i} onClick={() => onSelect(i)}>
            <Icons.starOutline
              key={i}
              className="h-6 w-6 align-baseline text-muted-foreground"
            />
          </button>
        );
      })}
    </div>
  );
}

function RenderPastWeeklyEvaluations({
  previousRatings,
}: {
  previousRatings: WeeklyFellowRatings;
}) {
  const [evaluationData, setEvaluationData] =
    React.useState<WeeklyFellowRatings>(previousRatings);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const handleEdit = async () => {
    let weeeklyEvaluation: Omit<
      WeeklyFellowRatings,
      "createdAt" | "updatedAt" | "fellowId" | "supervisorId" | "week"
    > = {
      behaviourNotes: evaluationData.behaviourNotes,
      dressingAndGroomingNotes: evaluationData.dressingAndGroomingNotes,
      programDeliveryNotes: evaluationData.programDeliveryNotes,
      punctualityNotes: evaluationData.punctualityNotes,
      id: evaluationData.id,
      behaviourRating: evaluationData.behaviourRating,
      dressingAndGroomingRating: evaluationData.dressingAndGroomingRating,
      programDeliveryRating: evaluationData.programDeliveryRating,
      punctualityRating: evaluationData.punctualityRating,
    };
    try {
      setIsSubmitting(true);
      const response = await editWeeklyFellowRating(weeeklyEvaluation);
      if (!response.success) {
        toast({
          variant: "destructive",
          title: "Submission error",
          description: response.error,
        });
        return;
      } else {
        toast({
          variant: "default",
          title: "Success",
          description: "Successfully edited weekly evaluation",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Submission error",
        description: "Something went wrong during submission, please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccordionItem value={`item-${evaluationData.id}`} key={evaluationData.id}>
      <AccordionTrigger>
        Week of {evaluationData.week.toLocaleDateString()}
      </AccordionTrigger>
      <AccordionContent>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="font-bold">
                <div className="flex items-center">
                  Behaviour Notes -
                  <Input
                    type="number"
                    max={5}
                    min={1}
                    className="ml-2 w-14"
                    value={String(evaluationData.behaviourRating)}
                    onChange={(e) => {
                      let value = e.target.valueAsNumber;
                      if (value > 5) {
                        value = 5;
                      }
                      if (value < 1) {
                        value = 1;
                      }
                      setEvaluationData({
                        ...evaluationData,
                        behaviourRating: value,
                      });
                    }}
                  />
                </div>
              </TableCell>
              <TableCell>
                <Textarea
                  value={evaluationData.behaviourNotes}
                  onChange={(e) =>
                    setEvaluationData({
                      ...evaluationData,
                      behaviourNotes: e.target.value,
                    })
                  }
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">
                <div className="flex items-center">
                  Program Delivery Notes -
                  <Input
                    type="number"
                    max={5}
                    min={1}
                    className="ml-2 w-14"
                    value={String(evaluationData.programDeliveryRating)}
                    onChange={(e) => {
                      let value = e.target.valueAsNumber;
                      if (value > 5) {
                        value = 5;
                      }
                      if (value < 1) {
                        value = 1;
                      }
                      setEvaluationData({
                        ...evaluationData,
                        programDeliveryRating: value,
                      });
                    }}
                  />
                </div>
              </TableCell>
              <TableCell>
                <Textarea
                  value={evaluationData.programDeliveryNotes}
                  onChange={(e) =>
                    setEvaluationData({
                      ...evaluationData,
                      programDeliveryNotes: e.target.value,
                    })
                  }
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">
                <div className="flex items-center">
                  Dressing & Grooming -
                  <Input
                    type="number"
                    max={5}
                    min={1}
                    className="ml-2 w-14"
                    value={String(evaluationData.dressingAndGroomingRating)}
                    onChange={(e) => {
                      let value = e.target.valueAsNumber;
                      if (value > 5) {
                        value = 5;
                      }
                      if (value < 1) {
                        value = 1;
                      }
                      setEvaluationData({
                        ...evaluationData,
                        dressingAndGroomingRating: value,
                      });
                    }}
                  />
                </div>
              </TableCell>
              <TableCell>
                <Textarea
                  value={evaluationData.dressingAndGroomingNotes}
                  onChange={(e) =>
                    setEvaluationData({
                      ...evaluationData,
                      dressingAndGroomingNotes: e.target.value,
                    })
                  }
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">
                <div className="flex items-center">
                  Punctuality Notes -
                  <Input
                    type="number"
                    max={5}
                    min={1}
                    className="ml-2 w-14"
                    value={String(evaluationData.punctualityRating)}
                    onChange={(e) => {
                      let value = e.target.valueAsNumber;
                      if (value > 5) {
                        value = 5;
                      }
                      if (value < 1) {
                        value = 1;
                      }
                      setEvaluationData({
                        ...evaluationData,
                        punctualityRating: value,
                      });
                    }}
                  />
                </div>
              </TableCell>
              <TableCell>
                <Textarea
                  value={evaluationData.punctualityNotes}
                  onChange={(e) =>
                    setEvaluationData({
                      ...evaluationData,
                      punctualityNotes: e.target.value,
                    })
                  }
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Button
          onClick={handleEdit}
          disabled={isSubmitting}
          variant="destructive"
          className="mt-4"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Edit
        </Button>
      </AccordionContent>
    </AccordionItem>
  );
}
