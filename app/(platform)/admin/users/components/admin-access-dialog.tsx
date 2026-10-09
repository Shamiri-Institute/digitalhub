"use client";

import { useForm } from "react-hook-form";
import type { z } from "zod";

import { TEAM_LABELS, type AdminTeam } from "#/db/enums";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { createAdmin, updateAdminAccess } from "#/lib/actions/admin/access";
import { CreateAdminSchema } from "#/lib/actions/admin/access-schemas";
import { zodResolver } from "#/lib/zod-resolver";
import type { ImplementerAdmin } from "../queries";

type FormValues = z.infer<typeof CreateAdminSchema>;

// A Select item cannot have an empty value, so "no team" needs a value of its own.
const NO_TEAM = "NONE";

interface AdminAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The admin whose access is edited. Leave it out to add a new admin. */
  admin?: ImplementerAdmin;
}

export default function AdminAccessDialog({ open, onOpenChange, admin }: AdminAccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="lg:w-2/5 lg:max-w-none">
        <AdminAccessForm admin={admin} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AdminAccessForm({ admin, onDone }: { admin?: ImplementerAdmin; onDone: () => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(CreateAdminSchema),
    defaultValues: {
      adminName: admin?.adminName ?? "",
      email: admin?.email ?? "",
      team: admin?.team ?? null,
      isSuperAdmin: admin?.isSuperAdmin ?? false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    const response = admin
      ? await updateAdminAccess({
          adminId: admin.id,
          team: values.team,
          isSuperAdmin: values.isSuperAdmin,
        })
      : await createAdmin(values);

    if (!response.success) {
      toast({ variant: "destructive", description: response.message });
      return;
    }
    toast({ description: response.message });
    onDone();
  };

  return (
    <Form {...form}>
      <form onSubmit={toastOnError(form.handleSubmit(onSubmit))}>
        <DialogHeader>
          <DialogTitle className="text-xl">
            {admin ? "Manage user access" : "Add a new user"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <FormField
            control={form.control}
            name="adminName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Full name <span className="text-shamiri-light-red">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} disabled={admin !== undefined} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Email address <span className="text-shamiri-light-red">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} type="email" disabled={admin !== undefined} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="team"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value === NO_TEAM ? null : (value as AdminTeam))
                  }
                  value={field.value ?? NO_TEAM}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_TEAM}>No team</SelectItem>
                    {Object.entries(TEAM_LABELS).map(([team, label]) => (
                      <SelectItem key={team} value={team}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isSuperAdmin"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    className="h-5 w-5 border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue"
                  />
                </FormControl>
                <FormLabel className="font-normal">Is super admin?</FormLabel>
              </FormItem>
            )}
          />
        </div>
        <Separator className="mb-4" />
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="ghost"
            type="button"
            className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
            onClick={onDone}
          >
            Cancel
          </Button>
          <Button
            className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white"
            type="submit"
            disabled={form.formState.isSubmitting}
            loading={form.formState.isSubmitting}
          >
            Save
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
