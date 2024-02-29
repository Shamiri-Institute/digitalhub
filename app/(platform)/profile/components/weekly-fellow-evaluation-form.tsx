"use client";
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
import { format, startOfWeek, subWeeks } from "date-fns";
import { Loader2 } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { submitWeeklyFellowRating } from "../actions";
import { WeeklyFellowRatingSchema } from "../schema";

function generateWeekFieldValues() {
  const numWeeks = 4;

  let selectValues = [];
  const today = new Date();

  for (let i = numWeeks; i >= 0; i--) {
    const date = subWeeks(today, i);
    const week = startOfWeek(date, { weekStartsOn: 1 });
    selectValues.push(
      <SelectItem value={format(week, "yyyy-MM-dd")}>
        Week {numWeeks - i + 1} - {format(week, "dd/MM/yyyy")}
      </SelectItem>,
    );
  }

  return selectValues;
}

const InputSchema = WeeklyFellowRatingSchema.pick({
  programDeliveryNotes: true,
  dressingAndGroomingNotes: true,
  attendanceNotes: true,
  behaviourNotes: true,
  week: true,
});

export default function WeeklyEvaluationForm({
  children,
  previousRatings = [],
  fellowId,
  supervisorId,
}: {
  children: React.ReactNode;
  previousRatings: WeeklyFellowRatings[];
  fellowId: string;
  supervisorId: string;
}) {
  const [open, setDialogOpen] = React.useState<boolean>(false);

  const form = useForm<z.infer<typeof InputSchema>>({
    resolver: zodResolver(InputSchema),
    defaultValues: {
      programDeliveryNotes: "",
      dressingAndGroomingNotes: "",
      attendanceNotes: "",
      behaviourNotes: "",
    },
  });

  async function onSubmit(data: z.infer<typeof InputSchema>) {
    const weeklyRatingBody = {
      ...data,
      fellowId,
      supervisorId,
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

              <div className="px-6">
                <FormField
                  control={form.control}
                  name="behaviourNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fellow Behaviour</FormLabel>
                      <FormControl>
                        <Textarea className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="px-6">
                <FormField
                  control={form.control}
                  name="programDeliveryNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program Delivery</FormLabel>
                      <FormControl>
                        <Textarea className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="px-6">
                <FormField
                  control={form.control}
                  name="dressingAndGroomingNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dressing and Grooming</FormLabel>
                      <FormControl>
                        <Textarea className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="px-6">
                <FormField
                  control={form.control}
                  name="attendanceNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attendance</FormLabel>
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
                <AccordionItem value={`item-${pr.id}`} key={pr.id}>
                  <AccordionTrigger>
                    Week of {pr.week.toLocaleDateString()}
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-bold">
                            Behaviour Notes
                          </TableCell>
                          <TableCell>{pr.behaviourNotes}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-bold">
                            Program Delivery Notes
                          </TableCell>
                          <TableCell>{pr.programDeliveryNotes}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-bold">
                            Dressing and Grooming Notes
                          </TableCell>
                          <TableCell>{pr.dressingAndGroomingNotes}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-bold">
                            Attendance Notes
                          </TableCell>
                          <TableCell>{pr.attendanceNotes}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
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
