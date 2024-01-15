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
import { Form, FormField } from "#/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Popover, PopoverContent } from "#/components/ui/popover";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";

import { useToast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";
import { updateClinicalCaseSessionAttendance } from "#/app/actions";
import { useState } from "react";

const FormSchema = z.object({
  session: z.string({
    required_error: "Please select the session.",
  }),
  dateOfSession: z.date({
    required_error: "Please select the date of session.",
  }),
});


export function AddClinicalSessionDialog({
  caseId,
  supervisorId,
  children,
}: {
  caseId: string;
  supervisorId: string;
  children: React.ReactNode;
}) {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      session: "",
      dateOfSession: undefined,
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    await updateClinicalCaseSessionAttendance({
      supervisorId,
      caseId,
      session: data.session ?? "",
      dateOfSession: data.dateOfSession,
    });

    toast({
      variant: "default",
      title: "Session attendance recorded successfully",
    });

    form.reset();
    setDialogOpen(false);

  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-4">


        <DialogHeader className="space-y-0 px-1 py-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium">
              Record Clinical Session with Student
            </span>
          </div>
        </DialogHeader>



        <Form {...form}>
          <form
            id="recordClinicalSessionAttendance"
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.error({ errors });
            })}
            className="overflow-hidden text-ellipsis px-1 pb-6"
          >
            <div className="mt-6 space-y-6">


              <div>
                <FormField
                  control={form.control}
                  name="session"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Select
                        name="session"
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">
                                Select Session
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pre">Pre</SelectItem>
                          <SelectItem value="S1">S1</SelectItem>
                          <SelectItem value="S2">S2</SelectItem>
                          <SelectItem value="S3">S3</SelectItem>
                          <SelectItem value="S4">S4</SelectItem>
                          <SelectItem value="F1">Follow-Up 1</SelectItem>
                          <SelectItem value="F2">Follow-Up 2</SelectItem>
                          <SelectItem value="F3">Follow-Up 3</SelectItem>
                          <SelectItem value="F4">Follow-Up 4</SelectItem>
                          <SelectItem value="F5">Follow-Up 5</SelectItem>
                          <SelectItem value="F6">Follow-Up 6</SelectItem>
                          <SelectItem value="F7">Follow-Up 7</SelectItem>
                          <SelectItem value="F8">Follow-Up 8</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="dateOfSession"
                  render={({ field }) => (
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
                  )}
                />
              </div>

              <Button
                type="submit"
                form="recordClinicalSessionAttendance"
                className="mt-4 mb-6 w-full bg-shamiri-blue py-5 text-white transition-transform hover:bg-shamiri-blue-darker active:scale-95"
              >
                Record Session Attendance
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}




