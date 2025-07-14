"use client"
import { useActionState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { inviteUserToImplementer } from "#/app/actions";
import { OrganizationAvatar } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { RoleTypes } from "#/models/role";
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
  message: "",
};

export function AddMemberDialog({ children }: { children: React.ReactNode }) {
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

  const [state, formAction] = useActionState(inviteUserToImplementer, initialState);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            action={formAction}
            className="overflow-hidden text-ellipsis"
          >
            <DialogHeader className="space-y-0 px-6 py-4">
              <div className="flex items-center gap-2">
                <OrganizationAvatar
                  src={organization.avatarUrl}
                  fallback={organization.name}
                  className="h-7 w-7"
                />
                <span className="text-base font-medium">Invite to your organization</span>
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
                      <Label htmlFor="emails">Emails</Label>
                      <Textarea
                        id="emails"
                        name="emails"
                        onChange={field.onChange}
                        defaultValue={field.value}
                        placeholder="email@example.com, email2@example.com..."
                        className="mt-1.5 resize-none bg-card"
                        data-testid={constants.ADD_MEMBERS_EMAILS}
                        data-1p-ignore="true"
                      />
                    </div>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="px-6">
                    <FormLabel>Invite as</FormLabel>
                    <Select onValueChange={field.onChange} name="role" defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-card" data-testid={constants.ADD_MEMBERS_ROLE}>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card">
                        {RoleTypes.map((role) => (
                          <SelectItem
                            key={role.slug}
                            value={role.slug}
                            className="transition hover:bg-foreground/3"
                            data-testid={`${constants.ADD_MEMBERS_ROLE}-${role.slug}`}
                          >
                            <div className="flex gap-1 text-sm">
                              <span className="font-medium">{role.name}</span>
                              <span className="text-muted-foreground">- {role.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end px-6 pb-6">
              <Button variant="brand" type="submit" data-testid={constants.ADD_MEMBERS_SUBMIT}>
                Submit
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
