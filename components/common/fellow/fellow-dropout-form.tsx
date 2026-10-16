import type { fellow as fellowTable, supervisor } from "#/db/schema";
import parsePhoneNumberFromString from "libphonenumber-js";
import { type Dispatch, type SetStateAction, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import type { MainFellowTableData } from "#/app/(platform)/hc/fellows/components/columns";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { DropoutConfirmStep, type StepProps } from "#/components/common/dropout-confirm-step";
import ReplaceFellow from "#/components/common/fellow/replace-fellow";
import { DropoutFellowSchema } from "#/components/common/fellow/schema";
import ArchiveGroup from "#/components/common/group/archive-group";
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
import { toast, toastOnError, toastOnFailure } from "#/components/ui/use-toast";
import { dropoutFellow } from "#/lib/actions/fellow";
import { FELLOW_DROP_OUT_REASONS } from "#/lib/app-constants/constants";
import { cn } from "#/lib/utils";
import { zodResolver } from "#/lib/zod-resolver";

type Group = NonNullable<MainFellowTableData["groups"]>[number];
type Step = "form" | "confirm" | "replace";
type Props = {
  fellow: MainFellowTableData;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  supervisors: (Pick<typeof supervisor.$inferSelect, "id" | "supervisorName"> & {
    fellows: Pick<typeof fellowTable.$inferSelect, "id" | "fellowName" | "droppedOut">[];
  })[];
};

export default function FellowDropoutForm({ fellow, isOpen, setIsOpen, supervisors }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [replaceGroupLeaderDialog, setReplaceGroupLeaderDialog] = useState(false);
  const [archiveGroupDialog, setArchiveGroupDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const activeGroups = fellow.groups?.filter((group) => !group.archivedAt) ?? [];
  // Once every group has a new leader or is archived, the replace step hands over to the confirm.
  const shownStep = step === "replace" && activeGroups.length === 0 ? "confirm" : step;

  function close() {
    setStep("form");
    setIsOpen(false);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : close())}>
        <DialogContent
          className={cn(
            "p-5",
            shownStep === "form" && "text-base font-medium leading-6",
            shownStep === "replace" && "min-h-[200px] w-5/6 max-w-none lg:w-2/5",
          )}
        >
          <FellowDropoutSteps
            fellow={fellow}
            step={shownStep}
            setStep={setStep}
            close={close}
            activeGroups={activeGroups}
            onReplace={(group) => {
              setSelectedGroup(group);
              setReplaceGroupLeaderDialog(true);
            }}
            onArchive={(group) => {
              setSelectedGroup(group);
              setArchiveGroupDialog(true);
            }}
          />
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
          <GroupAlertWidget fellow={fellow} group={selectedGroup} />
        </ReplaceFellow>
      )}

      {selectedGroup && (
        <ArchiveGroup
          groupId={selectedGroup.id}
          open={archiveGroupDialog}
          onOpenChange={setArchiveGroupDialog}
        >
          <GroupAlertWidget fellow={fellow} group={selectedGroup} />
        </ArchiveGroup>
      )}
    </>
  );
}

function FellowDropoutSteps({
  fellow,
  step,
  setStep,
  close,
  activeGroups,
  onReplace,
  onArchive,
}: {
  fellow: MainFellowTableData;
  activeGroups: Group[];
  onReplace: (group: Group) => void;
  onArchive: (group: Group) => void;
} & StepProps<Step>) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof DropoutFellowSchema>>({
    resolver: zodResolver(DropoutFellowSchema),
    defaultValues: { fellowId: fellow.id, mode: fellow.droppedOut ? "undo" : "dropout" },
  });

  function confirmSubmit() {
    if (activeGroups.length > 0 && form.getValues("mode") === "dropout") {
      setStep("replace");
      return;
    }
    startTransition(() =>
      toastOnFailure(async () => {
        const response = await dropoutFellow(form.getValues());
        toast({
          variant: response.success ? undefined : "destructive",
          description: response.success
            ? response.message
            : (response.message ?? "Something went wrong, please try again"),
        });
        close();
      }),
    );
  }

  const onSubmit = () => {
    if (form.getValues("mode") === "dropout") {
      setStep("confirm");
    } else {
      confirmSubmit();
    }
  };

  const alertWidget = (
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

  if (step === "confirm") {
    return (
      <DropoutConfirmStep isPending={isPending} onCancel={close} onConfirm={confirmSubmit}>
        {alertWidget}
      </DropoutConfirmStep>
    );
  }

  if (step === "replace") {
    return (
      <>
        <DialogHeader>
          <h2 className="text-lg font-bold">Replace fellow</h2>
        </DialogHeader>
        {alertWidget}
        <div className="space-y-4">
          <h3>For each of the following groups, assign a replacement or archive the group:</h3>
          <div className="divide-shamiri-light-gray flex flex-col gap-2 divide-y">
            {activeGroups.map((group) => (
              <div key={group.id} className="flex items-center justify-between gap-2 px-4 py-2">
                <p className="">
                  <span className="font-medium">{group.groupName}</span>
                  <span className="text-muted-foreground"> - {group.school.schoolName}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => onReplace(group)}>
                    Replace
                  </Button>
                  <Button
                    variant="outline"
                    className="text-shamiri-light-red hover:bg-red-bg"
                    onClick={() => onArchive(group)}
                  >
                    Archive
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Separator />
        <DialogFooter className="flex justify-end">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <Form {...form}>
      <DialogHeader>
        {fellow.droppedOut ? (
          <h2 className="text-lg font-bold">Undo student drop out?</h2>
        ) : (
          <h2 className="text-lg font-bold">Drop out fellow</h2>
        )}
      </DialogHeader>
      {alertWidget}
      <form onSubmit={toastOnError(form.handleSubmit(onSubmit))} className="space-y-5">
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
            onClick={close}
          >
            Cancel
          </Button>
          <Button
            variant={fellow.droppedOut ? "brand" : "destructive"}
            type="submit"
            disabled={isPending}
            loading={isPending}
          >
            {fellow.droppedOut ? "Undo" : "Submit"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function GroupAlertWidget({ fellow, group }: { fellow: MainFellowTableData; group: Group }) {
  return (
    <DialogAlertWidget>
      <div className="flex items-center gap-2">
        <span>{fellow.fellowName}</span>
        <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
        <span>{group.groupName}</span>
        <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
        <span>{group.school.schoolName}</span>
      </div>
    </DialogAlertWidget>
  );
}
