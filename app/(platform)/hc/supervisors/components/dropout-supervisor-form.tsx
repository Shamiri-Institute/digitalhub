import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { DropoutSupervisorSchema } from "#/app/(platform)/hc/schemas";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { dropoutSupervisor } from "#/app/(platform)/hc/supervisors/actions";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
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
import { toast } from "#/components/ui/use-toast";
import { SUPERVISOR_DROP_OUT_REASONS } from "#/lib/app-constants/constants";

export default function DropoutSupervisor({
  supervisorId,
  children,
  dropoutDialog,
  setDropoutDialog,
}: {
  supervisorId?: string;
  children: React.ReactNode;
  dropoutDialog: boolean;
  setDropoutDialog: Dispatch<SetStateAction<boolean>>;
}) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<z.infer<typeof DropoutSupervisorSchema>>();
  const pathname = usePathname();

  const form = useForm<z.infer<typeof DropoutSupervisorSchema>>({
    resolver: zodResolver(DropoutSupervisorSchema),
  });

  async function confirmSubmit() {
    setLoading(true);
    if (formData) {
      const response = await dropoutSupervisor(formData?.supervisorId, formData?.dropoutReason);
      if (!response.success) {
        toast({
          description: response.message ?? "Something went wrong, please try again",
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
    setFormData(data);
    setDropoutDialog(false);
    setConfirmDialogOpen(true);
  };

  useEffect(() => {
    form.reset({
      supervisorId,
    });
  }, [supervisorId, dropoutDialog]);

  return (
    <Form {...form}>
      <Dialog open={dropoutDialog} onOpenChange={setDropoutDialog}>
        <DialogContent className="p-5 text-base font-medium leading-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Drop out supervisor</DialogTitle>
          </DialogHeader>
          {children}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="dropoutReason"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>
                    Select reason <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a dropout reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUPERVISOR_DROP_OUT_REASONS.map((reason) => (
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
                  <Input id="supervisorId" name="supervisorId" type="hidden" value={field.value} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <DialogFooter className="flex justify-end">
              <Button
                className="text-shamiri-light-red hover:bg-red-bg"
                variant="ghost"
                type="button"
                onClick={() => {
                  setDropoutDialog(false);
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
            <DialogTitle className="text-lg font-bold">Confirm drop out</DialogTitle>
          </DialogHeader>
          {children}
          <div className="space-y-4">
            <h3>Are you sure?</h3>
            <Alert variant="destructive">
              <AlertTitle className="flex gap-2">
                <InfoIcon className="h-4 w-4 shrink-0" />
                Once this change has been made it is irreversible and will need you to contact
                support in order to modify. Please be sure of your action before you confirm.
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
                void confirmSubmit();
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
