"use client";
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
import React from "react";
import { useForm } from "react-hook-form";

type Props = {
  children: React.ReactNode;
  fellowName: string;
  fellowId: string;
  supervisorId: string;
  pastEvaluations: any[];
};

export default function FellowEvaluationForm(props: Props) {
  const [open, setDialogOpen] = React.useState<boolean>(false);

  const form = useForm({});

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
            <div>
              <div>Chart goes here</div>
              <div>
                {props.pastEvaluations?.length} Reporting Note
                {props.pastEvaluations?.length === 1 ? "" : "s"}
              </div>
              <div>
                <p>Fellow Behaviour</p>
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
                <p>Program delivery</p>
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
