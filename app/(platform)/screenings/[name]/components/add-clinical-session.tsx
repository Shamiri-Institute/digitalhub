"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
// @ts-expect-error
import { experimental_useFormState as useFormState } from "react-dom";

import { inviteUserToImplementer } from "#/app/actions";
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
import { Label } from "#/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";

const FormSchema = z.object({
  session: z.string({
    required_error: "Please select the session to reschedule.",
  }),
  role: z.string({
    required_error: "Please select the role to invite as.",
  }),
});

const initialState = {
  message: null,
};

// TODO: CLEAN UP THIS FILE

export function AddClinicalSessionDialog({
  // session,
  children,
}: {
  // session: any;
  children: React.ReactNode;
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }

  const [state, formAction] = useFormState(
    inviteUserToImplementer,
    initialState,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <Form {...form}>
          <form
            // onSubmit={form.handleSubmit(onSubmit)}
            action={formAction}
            className="overflow-hidden text-ellipsis"
          >
            <DialogHeader className="space-y-0 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-medium">
                  Record Clinical Session with Student A
                </span>
              </div>
            </DialogHeader>
            <Separator />
            <div className="my-6 space-y-6">
              <div className="px-4">
                <FormField
                  control={form.control}
                  name="session"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="session">Session</Label>
                      <Select
                        name="session"
                        // defaultValue={fellow?.gender || field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            // defaultValue={fellow?.gender || field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">
                                Select session
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

              <div className="px-4">
                <FormField
                  control={form.control}
                  name="session"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Select
                        name="session"
                        // defaultValue={fellow?.gender || field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            // defaultValue={fellow?.gender || field.value}
                            onChange={field.onChange}
                            placeholder={
                              <div className="flex items-center gap-4">
                                <span className="text-muted-foreground">
                                  Select Date
                                </span>
                                <Icons.calendar className="h-4 w-4" />
                              </div>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {/* <PopoverContent className="w-auto p-0"> */}
                          <Calendar
                            mode="single"
                            //   selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                          {/* </PopoverContent> */}
                        </SelectContent>
                      </Select>
                    </div>
                    // <Popover>
                    //     <PopoverTrigger asChild>
                    //         <Button
                    //             variant={null}
                    //             className={cn(
                    //                 "my-0 py-0 pl-3 text-xs font-normal text-brand",
                    //                 !field.value && "pl-3 text-xs font-normal text-brand ",
                    //             )}
                    //         >
                    //             {field.value ? (
                    //                 format(field.value, "PPP")
                    //             ) : (
                    //                 <span>Monday, Jan 4th</span>
                    //             )}
                    //         </Button>
                    //     </PopoverTrigger>
                    //     <PopoverContent className="w-auto p-0">
                    //         <Calendar
                    //             mode="single"
                    //             //   selected={field.value}
                    //             onSelect={field.onChange}
                    //             initialFocus
                    //         />
                    //     </PopoverContent>
                    // </Popover>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end px-6 pb-6">
              <Button variant="brand" type="submit" className="w-full">
                Record Session Attendance
              </Button>
            </div>
            <p aria-live="polite" className="sr-only" role="status">
              {state?.message}
            </p>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
