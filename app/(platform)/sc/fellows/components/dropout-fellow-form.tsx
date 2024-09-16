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
  fellowId: FellowsData["id"];
  fellowPhoneNumber: FellowsData["mpesaNumber"];
  fellowName: FellowsData["fellowName"];
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

  React.useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <>
      <Dialog open={open} onOpenChange={setDialogOpen}>
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
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDialogOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDialogOpen(false);
                    setConfirmDialogOpen(true);
                  }}
                >
                  Submit
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-xl font-semibold">Confirm drop out</h2>
          </DialogHeader>
          <DialogAlertWidget label={`${fellowName} • ${fellowPhoneNumber}`} />
          <p>Are you sure</p>
          <DialogAlertWidget
            label="Once this change has been made it is irreversible and will need you to contact support in order to modify. Please be sure of your action before you confirm."
            variant="destructive"
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDialogOpen(false);
                form.reset();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => console.log(form.getValues)}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
