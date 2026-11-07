"use client";

import { Plus, Trash2 } from "lucide-react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { useForm, useFormContext, useFormState } from "react-hook-form";
import type { z } from "zod";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Form } from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import { toastOnError } from "#/components/ui/use-toast";
import { CreateHubSchema } from "#/lib/actions/admin/hub-schemas";
import { createHub } from "#/lib/actions/admin/hubs";
import { hubSessionTypes, isHubSessionCategory } from "#/lib/app-constants/hub-session-types";
import { zodResolver } from "#/lib/zod-resolver";
import type { HubSessionName } from "../queries";
import {
  diffSessionTypes,
  type FormSessionType,
  HubConfirmDialog,
  HubNameField,
  SESSION_ROW_GRID,
  SessionTypeRows,
  sessionTypeCount,
  useConfirmedSave,
  useSessionTypeGroups,
  withCodes,
} from "./session-types";

type CreateFormValues = z.infer<typeof CreateHubSchema>;

const defaultSessionTypes = hubSessionTypes.flatMap(({ type, label, amount }) =>
  isHubSessionCategory(type) ? [{ type, label, amount }] : [],
);

const standardSessionTypes = hubSessionTypes.map(({ name, label, amount }) => ({
  code: name,
  label,
  amount,
}));

const noStoredSessionNames = new Map<string, HubSessionName>();

function openGroupsWithErrors(
  form: { getValues: () => { sessionTypes: FormSessionType[] } },
  setOpenGroups: Dispatch<SetStateAction<string[]>>,
) {
  return (errors: { sessionTypes?: unknown }) => {
    if (!Array.isArray(errors.sessionTypes)) return;
    const { sessionTypes } = form.getValues();
    const failing = errors.sessionTypes.flatMap((rowErrors, index) => {
      const group = rowErrors ? sessionTypes[index]?.type : undefined;
      return group ? [group] : [];
    });
    setOpenGroups((open) => [...new Set([...open, ...failing])]);
  };
}

export default function HubDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col lg:w-[42rem] lg:max-w-[calc(100vw-2rem)]">
        <CreateHubForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

/** The session types in collapsible groups, so the dialog stays short. */
function SessionTypesEditor({
  openGroups,
  onOpenGroupsChange,
}: {
  openGroups: string[];
  onOpenGroupsChange: (groups: string[]) => void;
}) {
  const form = useFormContext<CreateFormValues>();
  const { groups, addRow, remove } = useSessionTypeGroups(noStoredSessionNames);
  const { errors } = useFormState({ control: form.control, name: "sessionTypes" });

  return (
    <Accordion
      type="multiple"
      value={openGroups}
      onValueChange={onOpenGroupsChange}
      className="rounded-lg border"
    >
      {groups.map((group) => {
        const errorCount = group.rows.filter(({ index }) => errors.sessionTypes?.[index]).length;
        const { category } = group;
        const canRemoveAll = group.rows.length > 1;
        return (
          <AccordionItem
            key={group.type}
            value={group.type}
            className="border-b px-3 last:border-b-0"
          >
            <AccordionTrigger className="py-3 hover:no-underline">
              <span className="flex flex-1 items-baseline justify-between gap-3 pr-2 text-left">
                <span className="text-sm font-semibold text-foreground">{group.label}</span>
                <span className="flex items-baseline gap-3 text-xs font-medium">
                  {errorCount > 0 && (
                    <span className="text-shamiri-light-red">{errorCount} to fix</span>
                  )}
                  <span
                    className={
                      group.rows.length > 0 ? "text-shamiri-new-blue" : "text-shamiri-text-grey"
                    }
                  >
                    {group.rows.length === 0
                      ? "None"
                      : `${group.rows.length} ${group.rows.length === 1 ? "type" : "types"}`}
                  </span>
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3">
              {group.rows.length === 0 ? (
                <p className="text-sm text-shamiri-text-dark-grey">
                  This hub has no {group.noun}s.
                </p>
              ) : (
                <SessionTypeRows
                  group={group}
                  storedById={noStoredSessionNames}
                  onRemove={remove}
                />
              )}
              {category && (
                <div className={SESSION_ROW_GRID}>
                  <Button
                    type="button"
                    variant="outline"
                    className="col-start-2 gap-2 border-dashed border-shamiri-new-blue/40 px-2 text-shamiri-new-blue shadow-none hover:border-shamiri-new-blue hover:bg-blue-bg hover:text-shamiri-new-blue sm:px-4"
                    onClick={() => addRow(category)}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="sm:hidden">
                      Add session
                      <span className="sr-only"> ({group.label.toLowerCase()})</span>
                    </span>
                    <span className="hidden sm:inline">Add {group.noun}</span>
                  </Button>
                  {canRemoveAll && (
                    <Button
                      type="button"
                      variant="outline"
                      className="col-span-2 gap-2 border-red-border px-2 text-shamiri-light-red shadow-none hover:bg-red-bg hover:text-shamiri-light-red sm:px-4"
                      aria-label={`Remove all ${group.label.toLowerCase()}`}
                      onClick={() => remove(group.rows.map(({ index }) => index))}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove all
                    </Button>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function CreateHubForm({ onDone }: { onDone: () => void }) {
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(CreateHubSchema),
    defaultValues: { hubName: "", sessionTypes: defaultSessionTypes },
  });
  const { pending, setPending, isSaving, confirm } = useConfirmedSave(createHub, onDone);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const changes = pending
    ? diffSessionTypes(standardSessionTypes, withCodes(pending.sessionTypes, noStoredSessionNames))
    : [];

  const onInvalid = openGroupsWithErrors(form, setOpenGroups);

  return (
    <Form {...form}>
      <form
        noValidate
        className="flex flex-col"
        onSubmit={toastOnError(form.handleSubmit(setPending, onInvalid))}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl">Add a new hub</DialogTitle>
          <DialogDescription className="text-left text-shamiri-text-grey">
            Name the hub, then review its session types. Expand a group to add or remove session
            types, or to change a label or an amount.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-1.5 py-4">
          <HubNameField />
          <div className="space-y-2">
            <div className="space-y-1.5">
              <Label className="text-base">Session types</Label>
              <p className="text-xs text-muted-foreground">
                Keep only the session types this hub runs. Labels can be updated, and you can change
                the amount paid to fellows per lesson.
              </p>
            </div>
            <SessionTypesEditor openGroups={openGroups} onOpenGroupsChange={setOpenGroups} />
          </div>
        </div>
        <Separator className="mb-4 shrink-0" />
        <DialogFooter className="flex shrink-0 justify-end gap-2">
          <Button
            variant="ghost"
            type="button"
            className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
            onClick={onDone}
          >
            Cancel
          </Button>
          <Button
            className="flex items-center gap-2 text-base font-semibold leading-6"
            type="submit"
            disabled={form.formState.isSubmitting}
            loading={form.formState.isSubmitting}
          >
            Save
          </Button>
        </DialogFooter>
      </form>
      <HubConfirmDialog
        open={pending !== null}
        title="Create hub?"
        summary={
          <>
            You are about to create{" "}
            <span className="font-semibold text-foreground">{pending?.hubName}</span> with{" "}
            {sessionTypeCount(pending?.sessionTypes.length ?? 0)}.
          </>
        }
        changes={changes}
        changesHeading={`${sessionTypeCount(changes.length)} ${changes.length === 1 ? "differs" : "differ"} from the standard list`}
        emptyText="Labels and fellow pay amounts will be saved as shown."
        confirmLabel="Create hub"
        isSaving={isSaving}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        onConfirm={toastOnError(confirm)}
      />
    </Form>
  );
}
