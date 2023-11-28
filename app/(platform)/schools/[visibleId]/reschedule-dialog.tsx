"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
// @ts-expect-error
import { experimental_useFormState as useFormState } from "react-dom";

import { inviteUserToImplementer } from "#/app/actions";
import { Button } from "#/components/ui/button";
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
import { constants } from "#/tests/constants";

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

export function RescheduleDialog({
  fellow,
  children,
}: {
  fellow: any;
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
                  Reschedule {fellow.fellowName?.trim()}&apos; Sessions
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
                        defaultValue={fellow?.gender || field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={fellow?.gender || field.value}
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
                      <Label htmlFor="session">Supervisor</Label>
                      <Select
                        name="session"
                        defaultValue={fellow?.gender || field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={fellow?.gender || field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">
                                Select supervisor
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pre">Supervisor A</SelectItem>
                          <SelectItem value="S1">Supervisor B</SelectItem>
                          <SelectItem value="S2">Supervisor C</SelectItem>
                          <SelectItem value="S3">Supervisor D</SelectItem>
                          <SelectItem value="S4">Supervisor E</SelectItem>
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
                      <Label htmlFor="session">Fellow</Label>
                      <Select
                        name="session"
                        defaultValue={fellow?.gender || field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={fellow?.gender || field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">
                                Select fellow
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pre">Fellow A</SelectItem>
                          <SelectItem value="S1">Fellow B</SelectItem>
                          <SelectItem value="S2">Fellow C</SelectItem>
                          <SelectItem value="S3">Fellow D</SelectItem>
                          <SelectItem value="S4">Fellow E</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end px-6 pb-6">
              <Button
                variant="destructive"
                type="submit"
                data-testid={constants.ADD_MEMBERS_SUBMIT}
                className="w-full bg-[#AC2925]"
              >
                Reschedule {fellow.fellowName?.trim()}&apos;s Sessions
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
