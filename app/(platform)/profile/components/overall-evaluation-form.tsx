"use client";
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
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

type Props = {
  children: React.ReactNode;
  fellowName: string;
  fellowId: string;
  supervisorId: string;
  pastEvaluations: any[]; // TODO: tighten types
  pastAttendances: any[]; // TODO: tighten types
};

const InputSchema = z.object({
  fellowBehaviourNotes: z.string(),
  programDeliveryNotes: z.string(),
  dressingAndGroomingNotes: z.string(),
  attendanceNotes: z.string(),
});

export default function FellowEvaluationForm(props: Props) {
  const [open, setDialogOpen] = React.useState<boolean>(false);

  const form = useForm<z.infer<typeof InputSchema>>({
    resolver: zodResolver(InputSchema),
  });

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form>
            <DialogHeader>
              <h2>{props.fellowName} Overall Report</h2>
            </DialogHeader>
            <Separator />
            <div className="space-y-6">
              <div>Chart goes here</div>
              <div>
                {props.pastEvaluations?.length} Reporting Note
                {props.pastEvaluations?.length === 1 ? "" : "s"}
              </div>
              <div>
                <div className="flex gap-4">
                  <p>Fellow Behaviour</p>
                  <div></div>
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
                <p>Dressing and grooming</p>
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
                <p>Attendance</p>
                <FormField
                  control={form.control}
                  name="attendanceNotes"
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
