"use client";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
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
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { FELLOW_DROP_OUT_REASONS } from "#/lib/app-constants/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { FellowsData } from "../../actions";
import { DropoutFellowSchema } from "../../schemas";

export default function DropoutFellowForm({
  children,
  fellowId,
  fellowPhoneNumber,
  fellowName,
  otherSupervisors,
}: {
  children: React.ReactNode;
  fellowId: string;
  fellowPhoneNumber: string;
  fellowName: string;
  otherSupervisors: FellowsData["supervisors"];
}) {
  const [open, setDialogOpen] = React.useState<boolean>(false);
  const [confirmOpen, setConfirmDialogOpen] = React.useState<boolean>(false);

  const form = useForm<DropoutFellowSchema>({
    resolver: zodResolver(DropoutFellowSchema),
    defaultValues: {
      fellowId,
      replacementFellowId: "",
      dropoutReason: undefined,
    },
  });

  const supervisorValue = form.watch("replacementSupervisorId", "");
  const fellowsForSupervisor =
    otherSupervisors.find((supervisor) => supervisor.id === supervisorValue)
      ?.fellows || [];

  React.useEffect(() => {
    if (!supervisorValue) {
      form.setValue("replacementFellowId", "");
    }
  }, [supervisorValue]);

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-xl font-semibold">Dropout Fellow</h2>
          </DialogHeader>
          <DialogAlertWidget label={`${fellowName} • ${fellowPhoneNumber}`} />
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="dropoutReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select dropout reason</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FELLOW_DROP_OUT_REASONS.map((dropoutReason) => (
                          <SelectItem key={dropoutReason} value={dropoutReason}>
                            {dropoutReason}
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
                name="replacementSupervisorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select supervisor</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {otherSupervisors.map(({ id, supervisorName }) => (
                          <SelectItem key={id} value={id}>
                            {supervisorName}
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
                name="replacementFellowId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Fellow</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fellowsForSupervisor.map(({ id, fellowName }) => (
                          <SelectItem key={id} value={id}>
                            {fellowName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmOpen} onOpenChange={setConfirmDialogOpen}></Dialog>
    </>
  );
}
