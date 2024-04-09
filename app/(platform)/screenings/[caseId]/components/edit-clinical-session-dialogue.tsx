"use client";

import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
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
import { Popover, PopoverContent } from "#/components/ui/popover";

import { zodResolver } from "@hookform/resolvers/zod";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { editClinicalCaseSessionAttendanceDate } from "#/app/actions";
import { useToast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const FormSchema = z.object({
  dateOfSession: z.date({
    required_error: "Please select the date of session.",
  }),
});

export function EditClinicalSessionDateDialog({
  sessionId,
  children,
  session,
  date,
  caseId,
}: {
  sessionId: string;
  children: React.ReactNode;
  session: string;
  date: Date;
  caseId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      dateOfSession: undefined,
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      const response = await editClinicalCaseSessionAttendanceDate({
        dateOfSession: data.dateOfSession,
        sessionId,
      });

      if (!response.success) {
        toast({
          variant: "default",
          title: "Something went wrong, please try again",
        });
        return;
      }

      toast({
        variant: "default",
        title: "Session attendance recorded successfully",
      });

      form.reset();
      setDialogOpen(false);
      window.location.href = `/screenings/${caseId}`;
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-4">
        <DialogHeader className="space-y-0 px-1 py-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium">
              Update {session}&apos;s date with student
            </span>
          </div>
        </DialogHeader>

        <div className="px-1 text-sm text-muted-foreground">
          Current date: {new Date(date).toLocaleDateString()}
        </div>
        <Form {...form}>
          <form
            id="editClinicalSessionAttendance"
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.error({ errors });
            })}
            className="overflow-hidden text-ellipsis px-1 pb-6"
          >
            <div className="mt-6 space-y-6">
              <div>
                <FormField
                  control={form.control}
                  name="dateOfSession"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="mt-3 grid w-full gap-1.5">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "mt-1.5 w-full justify-start px-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                <Icons.calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                form="editClinicalSessionAttendance"
                className="mb-6 mt-4 w-full bg-shamiri-blue py-5 text-white transition-transform hover:bg-shamiri-blue-darker active:scale-95"
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Edit Session Attendance
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
