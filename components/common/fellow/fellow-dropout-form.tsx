import { zodResolver } from "@hookform/resolvers/zod";
import type { Prisma } from "@prisma/client";
import parsePhoneNumberFromString from "libphonenumber-js";
import { InfoIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import type { MainFellowTableData } from "#/app/(platform)/hc/fellows/components/columns";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import ReplaceFellow from "#/components/common/fellow/replace-fellow";
import { DropoutFellowSchema } from "#/components/common/fellow/schema";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "#/components/ui/dialog";
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

type Group = Prisma.InterventionGroupGetPayload<{
  include: { school: true };
}>;

export default function FellowDropoutForm({
  fellow,
  isOpen,
  setIsOpen,
  supervisors,
}: {
  fellow: MainFellowTableData;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  supervisors: Prisma.SupervisorGetPayload<{
    include: { fellows: true };
  }>[];
}) {
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [replaceDialog, setReplaceDialog] = useState(false);
  const [replaceGroupLeaderDialog, setReplaceGroupLeaderDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
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
  }, [fellow, isOpen, form]);

  useEffect(() => {
    if (fellow.groups && fellow.groups.length === 0 && replaceDialog) {
      setConfirmDialog(true);
      setReplaceDialog(false);
    }
  }, [fellow.groups, replaceDialog]);

  async function confirmSubmit() {
    setLoading(true);
    if (fellow.groups && fellow.groups.length > 0 && form.getValues("mode") === "dropout") {
      setReplaceDialog(true);
      setConfirmDialog(false);
      setLoading(false);
      return;
    }
    const response = await dropoutFellow(form.getValues());
    if (!response.success) {
      toast({
        variant: "destructive",
        description: response.message ?? "Something went wrong, please try again",
      });
      setConfirmDialog(false);
      setLoading(false);
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
          <span className="h-1 w-1 rounded-full bg-shamiri-new-blue" />
          <span>
            {(fellow.cellNumber &&
              parsePhoneNumberFromString(fellow.cellNumber, "KE")?.formatNational()) ??
              fellow.cellNumber}
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
                      Select reason <span className="text-shamiri-light-red">*</span>
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
                disabled={fellow.droppedOut ? loading : form.formState.isSubmitting}
                loading={fellow.droppedOut ? loading : form.formState.isSubmitting}
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
                Once this change has been made it is irreversible and will need you to contact
                support in order to modify. Please be sure of your action before you confirm.
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

      <Dialog open={replaceDialog} onOpenChange={setReplaceDialog}>
        <DialogContent className="min-h-[200px] w-5/6 max-w-none p-5 lg:w-2/5">
          <DialogHeader>
            <h2 className="text-lg font-bold">Replace fellow</h2>
          </DialogHeader>
          {renderAlertWidget()}
          <div className="space-y-4">
            <h3>Replace this fellow in the following groups:</h3>
            <div className="divide-shamiri-light-gray flex flex-col gap-2 divide-y">
              {fellow.groups?.map((group) => (
                <div key={group.id} className="flex items-center justify-between gap-2 px-4 py-2">
                  <p className="">
                    <span className="font-medium">{group.groupName}</span>
                    <span className="text-muted-foreground"> - {group.school.schoolName}</span>
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedGroup(group);
                      setReplaceGroupLeaderDialog(true);
                    }}
                  >
                    Replace
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <DialogFooter className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setReplaceDialog(false);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedGroup && (
        <ReplaceFellow
          open={replaceGroupLeaderDialog}
          onOpenChange={setReplaceGroupLeaderDialog}
          fellowId={fellow.id}
          groupId={selectedGroup.id}
          supervisors={supervisors}
        >
          <DialogAlertWidget>
            <div className="flex items-center gap-2">
              <span>{fellow.fellowName}</span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
              <span>{selectedGroup.groupName}</span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
              <span>{selectedGroup.school.schoolName}</span>
            </div>
          </DialogAlertWidget>
        </ReplaceFellow>
      )}
    </Form>
  );
}
