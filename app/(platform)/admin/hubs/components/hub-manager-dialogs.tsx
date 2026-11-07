"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { archiveHubManager, createHubManager } from "#/lib/actions/admin/hub-managers";
import { CreateHubManagerSchema } from "#/lib/actions/admin/hub-manager-schemas";
import { KENYAN_COUNTIES } from "#/lib/app-constants/constants";
import { GENDER_OPTIONS } from "#/lib/constants";
import { zodResolver } from "#/lib/zod-resolver";
import type { HubManager } from "../queries";

type FormValues = z.infer<typeof CreateHubManagerSchema>;

const REQUIRED_FIELDS = [
  { name: "coordinatorName", label: "Full name", type: "text" },
  { name: "coordinatorEmail", label: "Email address", type: "email" },
  { name: "cellNumber", label: "Phone number", type: "tel" },
  { name: "idNumber", label: "ID number", type: "text" },
] as const;

const OPTIONAL_FIELDS = [
  { name: "bankName", label: "Bank name" },
  { name: "bankBranch", label: "Bank branch" },
  { name: "bankAccountNumber", label: "Account number" },
  { name: "bankAccountName", label: "Account name" },
  { name: "kra", label: "KRA PIN" },
] as const;

export function AddHubManagerDialog({
  open,
  onOpenChange,
  hubId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hubId: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="lg:w-2/5 lg:max-w-none">
        <AddHubManagerForm hubId={hubId} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AddHubManagerForm({ hubId, onDone }: { hubId: string; onDone: () => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(CreateHubManagerSchema),
    defaultValues: {
      coordinatorName: "",
      coordinatorEmail: "",
      cellNumber: "",
      idNumber: "",
      subCounty: "",
      bankName: null,
      bankBranch: null,
      bankAccountNumber: null,
      bankAccountName: null,
      kra: null,
    },
  });
  const selectedCounty = useWatch({ control: form.control, name: "county" });
  const subCounties =
    KENYAN_COUNTIES.find((county) => county.name === selectedCounty)?.sub_counties ?? [];

  const onSubmit = async (values: FormValues) => {
    const response = await createHubManager(hubId, values);
    if (!response.success) {
      toast({ variant: "destructive", description: response.message });
      return;
    }
    toast({ description: response.message });
    onDone();
  };

  return (
    <Form {...form}>
      <form noValidate onSubmit={toastOnError(form.handleSubmit(onSubmit))}>
        <DialogHeader>
          <DialogTitle className="text-xl">Add hub manager</DialogTitle>
          <DialogDescription>They can sign in as soon as they are added.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {REQUIRED_FIELDS.map(({ name, label, type }) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem required>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input {...field} type={type} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem required>
                <FormLabel>Gender</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GENDER_OPTIONS.map((gender) => (
                      <SelectItem key={gender} value={gender}>
                        {gender}
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
            name="county"
            render={({ field }) => (
              <FormItem required>
                <FormLabel>County</FormLabel>
                <Select
                  onValueChange={(county) => {
                    field.onChange(county);
                    form.setValue("subCounty", "");
                  }}
                  value={field.value ?? ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select county" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-60">
                    {KENYAN_COUNTIES.map((county) => (
                      <SelectItem key={county.name} value={county.name}>
                        {county.name}
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
            name="subCounty"
            render={({ field }) => (
              <FormItem required>
                <FormLabel>Sub-county</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={subCounties.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={selectedCounty ? "Select sub-county" : "Pick a county first"}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-60">
                    {subCounties.map((subCounty) => (
                      <SelectItem key={subCounty} value={subCounty}>
                        {subCounty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="col-span-2 pt-2">
            <span className="text-xs uppercase text-shamiri-text-grey">
              Bank and tax details (optional)
            </span>
            <Separator />
          </div>
          {OPTIONAL_FIELDS.map(({ name, label }) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
        <Separator className="mb-4" />
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onDone}>
            Cancel
          </Button>
          <Button
            variant="brand"
            type="submit"
            disabled={form.formState.isSubmitting}
            loading={form.formState.isSubmitting}
          >
            Add hub manager
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function ArchiveHubManagerDialog({
  open,
  onOpenChange,
  manager,
  hubId,
  hubName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manager: HubManager;
  hubId: string;
  hubName: string;
}) {
  const [isArchiving, setIsArchiving] = useState(false);

  const archive = async () => {
    setIsArchiving(true);
    const response = await archiveHubManager({ hubId, hubManagerId: manager.id }).finally(() =>
      setIsArchiving(false),
    );
    if (!response.success) {
      toast({ variant: "destructive", description: response.message });
      return;
    }
    toast({ description: response.message });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Archive {manager.coordinatorName}?</DialogTitle>
          <DialogDescription>
            They lose access to the {hubName} hub dashboard. Any other role they hold keeps working.
            You can restore them later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="ghost" type="button" autoFocus onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            type="button"
            disabled={isArchiving}
            loading={isArchiving}
            onClick={toastOnError(archive)}
          >
            Archive hub manager
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
