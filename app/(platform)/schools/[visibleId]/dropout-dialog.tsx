"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
// @ts-expect-error
import { experimental_useFormState as useFormState } from "react-dom";

import { inviteUserToOrganization } from "#/app/actions";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Form, FormField } from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { constants } from "#/tests/constants";

const organization = {
  name: "Team Shamri",
  avatarUrl: "https://i.imgur.com/1s8jfQi.png",
};

const FormSchema = z.object({
  emails: z.string({
    required_error: "Please select the email(s) to invite.",
  }),
  role: z.string({
    required_error: "Please select the role to invite as.",
  }),
});

const initialState = {
  message: null,
};

export function DropoutDialog({
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
    inviteUserToOrganization,
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
                  Drop out {fellow.fellowName}
                </span>
              </div>
            </DialogHeader>
            <Separator />
            <div className="my-6 space-y-6">
              <div className="px-6">
                <FormField
                  control={form.control}
                  name="emails"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="emails">Reason</Label>
                      <Textarea
                        id="emails"
                        name="emails"
                        onChange={field.onChange}
                        defaultValue={field.value}
                        placeholder="e.g. Fellow is not interested in the program"
                        className="mt-1.5 resize-none bg-card"
                        data-testid={constants.ADD_MEMBERS_EMAILS}
                        data-1p-ignore="true"
                      />
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
                Drop out {fellow.fellowName}
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
