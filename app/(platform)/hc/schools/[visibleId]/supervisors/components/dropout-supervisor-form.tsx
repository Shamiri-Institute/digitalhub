"use client";
import { DropoutSupervisorSchema } from "#/app/(platform)/hc/schemas";
import { dropoutSupervisor } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/actions";
import { SupervisorInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/context/supervisor-info-context";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
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
import { toast } from "#/components/ui/use-toast";
import { SCHOOL_DROPOUT_REASONS } from "#/lib/app-constants/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { parsePhoneNumber } from "libphonenumber-js";
import { InfoIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export function DropoutSupervisor() {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] =
    useState<z.infer<typeof DropoutSupervisorSchema>>();
  const context = useContext(SupervisorInfoContext);
  const pathname = usePathname();

  const form = useForm<z.infer<typeof DropoutSupervisorSchema>>({
    resolver: zodResolver(DropoutSupervisorSchema),
  });

  async function confirmSubmit() {
    setLoading(true);
    if (formData) {
      const response = await dropoutSupervisor(
        formData?.supervisorId,
        formData?.dropoutReason,
      );
      if (!response.success) {
        toast({
          description:
            response.message ?? "Something went wrong, please try again",
        });
        return;
      }
      toast({
        description: response.message,
      });
      form.reset();
      setConfirmDialogOpen(false);
      setLoading(false);

      await revalidatePageAction(pathname);
    }
  }

  const onSubmit = (data: z.infer<typeof DropoutSupervisorSchema>) => {
    if (!context.supervisor) {
      return;
    }
    setFormData(data);
    context.setDropoutDialog(false);
    setConfirmDialogOpen(true);
  };

  useEffect(() => {
    form.reset({
      supervisorId: context.supervisor?.id,
    });
  }, [context.supervisor?.id, context.dropoutDialog, form]);

  const renderAlertWidget = () => {
    return (
      <DialogAlertWidget>
        <div className="flex items-center gap-2">
          <span>{context.supervisor?.supervisorName}</span>
          <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
          <span>
            {context.supervisor?.cellNumber &&
              parsePhoneNumber(
                context.supervisor?.cellNumber,
                "KE",
              ).formatNational()}
          </span>
        </div>
      </DialogAlertWidget>
    );
  };
  return (
    <Form {...form}>
      <Dialog
        open={context.dropoutDialog}
        onOpenChange={context.setDropoutDialog}
      >
        <DialogContent className="p-5 text-base font-medium leading-6">
          <DialogHeader>
            <h2 className="text-lg font-bold">Drop out supervisor</h2>
          </DialogHeader>
          {renderAlertWidget()}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="dropoutReason"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>
                    Select reason{" "}
                    <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a dropout reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SCHOOL_DROPOUT_REASONS.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
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
              name="supervisorId"
              render={({ field }) => (
                <FormItem>
                  <Input
                    id="supervisorId"
                    name="supervisorId"
                    type="hidden"
                    value={field.value}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <DialogFooter className="flex justify-end">
              <Button
                className="text-shamiri-light-red hover:bg-red-bg"
                variant="ghost"
                onClick={() => {
                  context.setDropoutDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                type="submit"
                disabled={form.formState.isSubmitting}
                loading={form.formState.isSubmitting}
              >
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="p-5">
          <DialogHeader>
            <h2 className="text-lg font-bold">Confirm drop out</h2>
          </DialogHeader>
          {renderAlertWidget()}
          <div className="space-y-4">
            <h3>Are you sure?</h3>
            <Alert variant="destructive">
              <AlertTitle className="flex gap-2">
                <InfoIcon className="h-4 w-4 shrink-0" />
                Once this change has been made it is irreversible and will need
                you to contact support in order to modify. Please be sure of
                your action before you confirm.
              </AlertTitle>
            </Alert>
          </div>
          <Separator />
          <DialogFooter className="flex justify-end">
            <Button
              className="text-shamiri-light-red"
              variant="ghost"
              onClick={() => {
                setConfirmDialogOpen(false);
                // context.setSchoolDropOutDialog(true);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading}
              loading={loading}
              onClick={() => {
                confirmSubmit();
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
