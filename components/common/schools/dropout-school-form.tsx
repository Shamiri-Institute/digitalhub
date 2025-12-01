"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { dropoutSchool, revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
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
import { SCHOOL_DROPOUT_REASONS } from "#/lib/app-constants/constants";
import { DropoutSchoolSchema } from "../../../app/(platform)/hc/schemas";
import type { SchoolsTableData } from "./columns";

export function DropoutSchool({
  school,
  open,
  setOpen,
}: {
  school: SchoolsTableData | null;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const [formData, setFormData] = useState<z.infer<typeof DropoutSchoolSchema>>();
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const form = useForm<z.infer<typeof DropoutSchoolSchema>>({
    resolver: zodResolver(DropoutSchoolSchema),
  });

  async function confirmSubmit() {
    setLoading(true);
    if (formData) {
      const response = await dropoutSchool(formData?.schoolId, formData?.dropoutReason);
      if (!response.success) {
        toast({
          description: response.message ?? "Something went wrong, please try again",
        });
        return;
      }

      await revalidatePageAction(pathname);
      toast({
        description: response.message,
      });
      form.reset();
      setConfirmDialogOpen(false);
      setLoading(false);
    }
  }

  const onSubmit = (data: z.infer<typeof DropoutSchoolSchema>) => {
    if (!school) {
      return;
    }
    setFormData(data);
    setOpen(false);
    setConfirmDialogOpen(true);
  };

  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    form.reset({
      schoolId: school?.id,
    });
  }, [school?.id, open, form]);

  return (
    <Form {...form}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-5 text-base font-medium leading-6">
          <DialogHeader>
            <DialogTitle>Drop out school</DialogTitle>
          </DialogHeader>
          <DialogAlertWidget label={school?.schoolName} />
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
              name="schoolId"
              render={({ field }) => (
                <FormItem>
                  <Input id="schoolId" name="schoolId" type="hidden" value={field.value} />
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
                  setOpen(false);
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
            <DialogTitle>Confirm drop out</DialogTitle>
            <DialogAlertWidget label={school?.schoolName} />
          </DialogHeader>
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
                setOpen(true);
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
