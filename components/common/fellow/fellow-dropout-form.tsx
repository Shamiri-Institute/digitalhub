import { MainFellowTableData } from "#/app/(platform)/hc/fellows/components/columns";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { DropoutFellowSchema } from "#/components/common/fellow/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { dropoutFellow } from "#/lib/actions/fellow";
import { FELLOW_DROP_OUT_REASONS } from "#/lib/app-constants/constants";
import { cn } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { parsePhoneNumber } from "libphonenumber-js";
import { InfoIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export default function FellowDropoutForm({
  fellow,
  isOpen,
  setIsOpen,
}: {
  fellow: MainFellowTableData;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const pathname = usePathname();

  const form = useForm<z.infer<typeof DropoutFellowSchema>>({
    resolver: zodResolver(DropoutFellowSchema),
    defaultValues: {
      fellowId: fellow.id,
      mode: fellow.droppedOut ? "undo" : "dropout",
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        fellowId: fellow.id,
        mode: fellow.droppedOut ? "undo" : "dropout",
      });
    }
  }, [fellow, isOpen]);

  async function confirmSubmit() {
    setLoading(true);
    const response = await dropoutFellow(form.getValues());
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

    await revalidatePageAction(pathname).then(() => {
      if (form.getValues("mode") === "dropout") {
        setConfirmDialog(false);
      } else {
        setIsOpen(false);
      }
      setLoading(false);
    });
  }

  const onSubmit = () => {
    if (form.getValues("mode") === "dropout") {
      setIsOpen(false);
      setConfirmDialog(true);
    } else {
      confirmSubmit();
    }
  };

  function renderAlertWidget() {
    return (
      <DialogAlertWidget separator={fellow.droppedOut ?? undefined}>
        <div className="flex items-center gap-2">
          <span>{fellow.fellowName}</span>
          <span className="h-1 w-1 rounded-full bg-shamiri-new-blue"></span>
          <span>
            {fellow.cellNumber &&
              parsePhoneNumber(fellow.cellNumber, "KE").formatNational()}
          </span>
        </div>
      </DialogAlertWidget>
    );
  }

  return (
    <Form {...form}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-5 text-base font-medium leading-6">
          <DialogHeader>
            {fellow.droppedOut ? (
              <h2 className="text-lg font-bold">Undo student drop out?</h2>
            ) : (
              <h2 className="text-lg font-bold">Drop out fellow</h2>
            )}
          </DialogHeader>
          {renderAlertWidget()}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {!fellow.droppedOut && (
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
                        {FELLOW_DROP_OUT_REASONS.map((reason) => (
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
            )}
            <Separator />
            <DialogFooter className="flex justify-end">
              <Button
                className={cn(
                  fellow.droppedOut
                    ? "text-shamiri-new-blue hover:bg-blue-bg"
                    : "text-shamiri-light-red hover:bg-red-bg",
                )}
                variant="ghost"
                type="button"
                onClick={() => {
                  setIsOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant={fellow.droppedOut ? "brand" : "destructive"}
                type="submit"
                disabled={
                  fellow.droppedOut ? loading : form.formState.isSubmitting
                }
                loading={
                  fellow.droppedOut ? loading : form.formState.isSubmitting
                }
              >
                {fellow.droppedOut ? "Undo" : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
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
              className="text-shamiri-light-red hover:bg-red-bg"
              variant="ghost"
              onClick={() => {
                setConfirmDialog(false);
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
