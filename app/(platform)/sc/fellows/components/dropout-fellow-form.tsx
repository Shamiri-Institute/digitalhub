"use client";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { toast } from "#/components/ui/use-toast";
import { FELLOW_DROP_OUT_REASONS } from "#/lib/app-constants/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { FellowsData, dropoutFellowWithReason } from "../../actions";
import { DropoutFellowSchema } from "../../schemas";

export default function DropoutFellowForm({
  children,
  fellowId,
  fellowPhoneNumber,
  fellowName,
  otherSupervisors,
}: {
  children: React.ReactNode;
  fellowId: FellowsData["id"];
  fellowPhoneNumber: FellowsData["mpesaNumber"];
  fellowName: FellowsData["fellowName"];
  otherSupervisors: FellowsData["supervisors"];
}) {
  const [open, setDialogOpen] = React.useState<boolean>(false);
  const [step, setStep] = React.useState<1 | 2>(1);

  const form = useForm<DropoutFellowSchema>({
    resolver: zodResolver(DropoutFellowSchema),
    defaultValues: {
      fellowId,
      replacementFellowId: "",
      replacementSupervisorId: "",
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

  React.useEffect(() => {
    if (!open) {
      form.reset();
      setStep(1);
    }
  }, [open, form]);

  async function onSubmit(data: DropoutFellowSchema) {
    const response = await dropoutFellowWithReason(
      data.fellowId,
      data.dropoutReason,
      data.replacementFellowId,
      "sc/fellows",
    );

    if (!response.success) {
      toast({
        title: "Could not drop out fellow",
        variant: "destructive",
        description: response.error ?? "An error occured",
      });

      return;
    }

    toast({
      title: "Successfully dropped out fellow and reassigned groups",
      variant: "default",
      description: response.message,
    });

    form.reset();
    setStep(1);
    setDialogOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          {step === 1 ? (
            <h2 className="text-xl font-semibold">Dropout Fellow</h2>
          ) : null}
          {step === 2 ? (
            <h2 className="text-xl font-semibold">Confirm Drop Out</h2>
          ) : null}
        </DialogHeader>
        <DialogAlertWidget label={`${fellowName} • ${fellowPhoneNumber}`} />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {step === 1 ? (
              <div className="space-y-4">
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
                            <SelectItem
                              key={dropoutReason}
                              value={dropoutReason}
                            >
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
                <DialogFooter>
                  <Button
                    variant="ghost"
                    className="text-shamiri-light-red"
                    onClick={() => {
                      setDialogOpen(false);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      form.trigger().then((isValid) => {
                        if (isValid) {
                          setStep(2);
                        }
                      })
                    }
                  >
                    Submit
                  </Button>
                </DialogFooter>
              </div>
            ) : null}
            {step === 2 ? (
              <div className="space-y-4">
                <p className="text-base font-medium">Are you sure?</p>
                <DialogAlertWidget
                  label="Once this change has been made it is irreversible and will need you to contact support in order to modify. Please be sure of your action before you confirm."
                  variant="destructive"
                />
                <DialogFooter>
                  <Button
                    variant="ghost"
                    className="text-shamiri-light-red"
                    onClick={() => {
                      form.reset();
                      setStep(1);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="destructive">
                    Confirm
                  </Button>
                </DialogFooter>
              </div>
            ) : null}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
