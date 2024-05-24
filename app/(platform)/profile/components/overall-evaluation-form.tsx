"use client";
import { Icons } from "#/components/icons";
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
  FormMessage,
} from "#/components/ui/form";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { submitOverallFellowReport } from "../actions";
import { OverallFellowSchema } from "../schema";

type Props = {
  children: React.ReactNode;
  fellowName: string;
  fellowId: string;
  behaviourRating?: number;
  programDeliveryRating?: number;
  dressingAndGroomingRating?: number;
  punctualityRating?: number;
  supervisorId: string;
  previousReportingNotes?: (Prisma.FellowReportingNotesGetPayload<{
    include: {
      supervisor: true
    }
  }>)[];
};

const InputSchema = OverallFellowSchema.pick({
  fellowBehaviourNotes: true,
  programDeliveryNotes: true,
  dressingAndGroomingNotes: true,
  punctualityNotes: true,
});

export default function FellowEvaluationForm(props: Props) {
  const [open, setDialogOpen] = React.useState<boolean>(false);

  const form = useForm<z.infer<typeof InputSchema>>({
    resolver: zodResolver(InputSchema),
    defaultValues: {
      fellowBehaviourNotes: "",
      programDeliveryNotes: "",
      dressingAndGroomingNotes: "",
      punctualityNotes: "",
    },
  });

  async function onSubmit(data: z.infer<typeof InputSchema>) {
    const result = await submitOverallFellowReport({
      ...data,
      fellowId: props.fellowId,
      supervisorId: props.supervisorId,
    });

    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Form submission error",
        description: `Failed to submit overall fellow report for ${props.fellowName}`,
      });
      return;
    }

    toast({
      variant: "default",
      title: "Successful submission",
      description: `Successfully added overall fellow report for ${props.fellowName}`,
    });
    form.reset();
    setDialogOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader className="mb-4">
              <h2 className="text-2xl text-brand">
                {props.fellowName} Overall Report
              </h2>
            </DialogHeader>
            <Separator />
            <div className="mt-4 space-y-6">
              {/*TODO: <div>Chart goes here</div>*/}
              <div>
                {props.previousReportingNotes?.length} Reporting Note
                {props.previousReportingNotes?.length === 1 ? "" : "s"}
              </div>
              <div>
                <div className="flex gap-4">
                  <p>Fellow Behaviour</p>
                  <RatingStars rating={props.behaviourRating ?? 0} />
                </div>
                <FormField
                  control={form.control}
                  name="fellowBehaviourNotes"
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
              <div>
                <div className="flex gap-4">
                  <p>Program delivery</p>
                  <RatingStars rating={props.programDeliveryRating ?? 0} />
                </div>
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
              <div>
                <div className="flex gap-2">
                  <p>Dressing and grooming</p>
                  <RatingStars rating={props.dressingAndGroomingRating ?? 0} />
                </div>
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
              <div>
                <div className="flex gap-2">
                  <p>Punctuation</p>
                  <RatingStars rating={props.punctualityRating ?? 0} />
                </div>
                <FormField
                  control={form.control}
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
            <Button type="submit" variant="brand" className="mt-6 w-full">
              Save
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex flex-1 justify-end">
      {[1, 2, 3, 4, 5].map((i) => {
        if (i <= Math.round(rating)) {
          return (
            <Icons.star
              key={i}
              className="ml-4 h-6 w-6 align-baseline text-muted-yellow xl:h-7 xl:w-7"
            />
          );
        }

        return (
          <Icons.starOutline
            key={i}
            className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7"
          />
        );
      })}
    </div>
  );
}
