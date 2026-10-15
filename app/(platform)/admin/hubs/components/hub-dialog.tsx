"use client";

import { ArrowRight, Lock, Plus, Trash2 } from "lucide-react";
import { type Dispatch, Fragment, type ReactNode, type SetStateAction, useState } from "react";
import { useFieldArray, useForm, useFormContext, useFormState } from "react-hook-form";
import type { z } from "zod";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { CreateHubSchema, EditHubFormSchema } from "#/lib/actions/admin/hub-schemas";
import { createHub, type HubSessionName, updateHub } from "#/lib/actions/admin/hubs";
import {
  assignSessionCodes,
  type HubSessionCategory,
  hubSessionTypes,
  isHubSessionCategory,
  newSessionTypeDefaults,
  type SessionTypeGroup,
} from "#/lib/app-constants/hub-session-types";
import { cn } from "#/lib/utils";
import type { ActionResponse } from "#/types/actions.types";
import { zodResolver } from "#/lib/zod-resolver";
import type { AdminHub } from "../queries";

type CreateFormValues = z.infer<typeof CreateHubSchema>;
type EditFormValues = z.infer<typeof EditHubFormSchema>;
type FormSessionType = {
  sessionNameId?: string;
  type: SessionTypeGroup;
  label: string;
  amount: number;
};
type SharedFormValues = { hubName: string; sessionTypes: FormSessionType[] };

const SESSION_TYPE_GROUPS: Record<SessionTypeGroup, { label: string; noun: string }> = {
  INTERVENTION: { label: "Intervention sessions", noun: "intervention session" },
  SUPERVISION: { label: "Supervision sessions", noun: "supervision session" },
  TRAINING: { label: "Training sessions", noun: "training session" },
  SPECIAL: { label: "Special sessions", noun: "special session" },
  CLINICAL: { label: "Clinical sessions", noun: "clinical session" },
  DATA_COLLECTION: { label: "Data follow-up sessions", noun: "data follow-up session" },
};

const defaultSessionTypes = hubSessionTypes.flatMap(({ type, label, amount }) =>
  isHubSessionCategory(type) ? [{ type, label, amount }] : [],
);

const standardSessionTypes = hubSessionTypes.map(({ name, label, amount }) => ({
  code: name,
  label,
  amount,
}));

const noStoredSessionNames = new Map<string, HubSessionName>();

const amountFormat = new Intl.NumberFormat("en-US");

type CodedSessionType = { code: string; label: string; amount: number };

type SessionTypeChange =
  | { kind: "added" | "removed"; code: string; label: string; amount: number }
  | {
      kind: "changed";
      code: string;
      label: { from: string; to: string };
      amount: { from: number; to: number };
    };

function withCodes(
  rows: FormSessionType[],
  storedById: ReadonlyMap<string, { sessionName: string }>,
): CodedSessionType[] {
  const codes = assignSessionCodes(rows, storedById);
  return rows.map((row, index) => ({
    code: codes[index] ?? "",
    label: row.label,
    amount: row.amount,
  }));
}

function diffSessionTypes(
  before: CodedSessionType[],
  after: CodedSessionType[],
): SessionTypeChange[] {
  const beforeByCode = new Map(before.map((row) => [row.code, row]));
  const afterCodes = new Set(after.map((row) => row.code));
  const addedOrChanged = after.flatMap((row): SessionTypeChange[] => {
    const old = beforeByCode.get(row.code);
    if (!old) return [{ kind: "added", ...row }];
    if (old.label === row.label && old.amount === row.amount) return [];
    return [
      {
        kind: "changed",
        code: row.code,
        label: { from: old.label, to: row.label },
        amount: { from: old.amount, to: row.amount },
      },
    ];
  });
  const removed = before
    .filter((row) => !afterCodes.has(row.code))
    .map((row): SessionTypeChange => ({ kind: "removed", ...row }));
  return [...addedOrChanged, ...removed];
}

const sessionTypeCount = (count: number) => `${count} session ${count === 1 ? "type" : "types"}`;

/**
 * A value in the confirmation: plain when unchanged, otherwise the old value struck through, an
 * arrow, and the new value. Screen readers hear "was" and "now", since strikethrough is silent.
 */
function ValueChange({ from, to, wrap = true }: { from: string; to: string; wrap?: boolean }) {
  if (from === to) {
    return <span className="text-shamiri-text-dark-grey">{to}</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-x-1.5 gap-y-0.5",
        wrap ? "flex-wrap" : "flex-nowrap",
      )}
    >
      <del className="text-shamiri-text-dark-grey">
        <span className="sr-only">was </span>
        {from}
      </del>
      <ArrowRight aria-hidden className="size-3.5 shrink-0 text-shamiri-new-blue" />
      <ins className="font-semibold text-foreground no-underline">
        <span className="sr-only">now </span>
        {to}
      </ins>
    </span>
  );
}

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

function useConfirmedSave<T>(action: (values: T) => Promise<ActionResponse>, onDone: () => void) {
  const [pending, setPending] = useState<T | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const confirm = async () => {
    if (!pending) return;
    setIsSaving(true);
    try {
      const response = await action(pending);
      setPending(null);
      if (!response.success) {
        toast({ variant: "destructive", description: response.message });
        return;
      }
      toast({ description: response.message });
      onDone();
    } finally {
      setIsSaving(false);
    }
  };

  return { pending, setPending, isSaving, confirm };
}

interface HubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edit?: { hub: AdminHub; sessionNames: HubSessionName[] };
}

export default function HubDialog({ open, onOpenChange, edit }: HubDialogProps) {
  const onDone = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col lg:w-[42rem] lg:max-w-[calc(100vw-2rem)]">
        {edit ? (
          <EditHubForm hub={edit.hub} sessionNames={edit.sessionNames} onDone={onDone} />
        ) : (
          <CreateHubForm onDone={onDone} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function HubNameField() {
  const { control } = useFormContext<SharedFormValues>();
  return (
    <FormField
      control={control}
      name="hubName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Hub name <span className="text-shamiri-light-red">*</span>
          </FormLabel>
          <FormControl>
            <Input {...field} autoComplete="off" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function HubDialogFooter({
  isSubmitting,
  onCancel,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  return (
    <>
      <Separator className="mb-4 shrink-0" />
      <DialogFooter className="flex shrink-0 justify-end gap-2">
        <Button
          variant="ghost"
          type="button"
          className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          className="flex items-center gap-2 text-base font-semibold leading-6"
          type="submit"
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

function EditHubForm({
  hub,
  sessionNames,
  onDone,
}: {
  hub: AdminHub;
  sessionNames: HubSessionName[];
  onDone: () => void;
}) {
  const form = useForm<EditFormValues>({
    resolver: zodResolver(EditHubFormSchema),
    defaultValues: {
      hubName: hub.hubName,
      sessionTypes: sessionNames.map((n) => ({
        sessionNameId: n.id,
        type: n.sessionType,
        label: n.sessionLabel,
        amount: n.amount,
      })),
    },
  });
  const storedById = new Map(sessionNames.map((n) => [n.id, n]));
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const onInvalid = openGroupsWithErrors(form, setOpenGroups);

  const { pending, setPending, isSaving, confirm } = useConfirmedSave<EditFormValues>(
    (values) =>
      updateHub({ hubId: hub.id, loadedSessionNameIds: sessionNames.map((n) => n.id), ...values }),
    onDone,
  );
  const changes = pending
    ? diffSessionTypes(
        sessionNames.map((n) => ({ code: n.sessionName, label: n.sessionLabel, amount: n.amount })),
        withCodes(pending.sessionTypes, storedById),
      )
    : [];
  const renamed = pending !== null && pending.hubName !== hub.hubName;

  return (
    <Form {...form}>
      <form
        className="flex flex-col"
        onSubmit={toastOnError(form.handleSubmit(setPending, onInvalid))}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl">Edit hub</DialogTitle>
          <DialogDescription className="text-left text-shamiri-text-grey">
            Rename the hub, or change its session types. Session codes cannot change.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-1.5 py-4">
          <HubNameField />
          <SessionTypesSection
            storedById={storedById}
            openGroups={openGroups}
            onOpenGroupsChange={setOpenGroups}
            description="Add or remove session types, or change a label or the amount paid to fellows per lesson. A session type that sessions use cannot be removed."
          />
        </div>
        <HubDialogFooter isSubmitting={form.formState.isSubmitting} onCancel={onDone} />
      </form>
      <HubConfirmDialog
        open={pending !== null}
        title="Save changes to hub?"
        summary={
          renamed ? (
            <>
              <span className="font-semibold text-foreground">{hub.hubName}</span> will be renamed
              to <span className="font-semibold text-foreground">{pending.hubName}</span>.
            </>
          ) : (
            <>
              You are about to update{" "}
              <span className="font-semibold text-foreground">{hub.hubName}</span>.
            </>
          )
        }
        changes={changes}
        changesHeading={`${sessionTypeCount(changes.length)} will change`}
        emptyText="Session types stay as they are."
        note={
          changes.some(
            (change) => change.kind === "changed" && change.amount.from !== change.amount.to,
          )
            ? "Attendance marked after the save is paid at the new amount. Payouts already recorded keep their amount, including when attendance is unmarked."
            : undefined
        }
        confirmLabel="Save changes"
        isSaving={isSaving}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        onConfirm={toastOnError(confirm)}
      />
    </Form>
  );
}

function SessionTypesSection({
  description,
  ...editorProps
}: { description: string } & SessionTypesEditorProps) {
  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label className="text-base">Session types</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <SessionTypesEditor {...editorProps} />
    </div>
  );
}

function SessionTypeAmountField({ index, sessionName }: { index: number; sessionName: string }) {
  const form = useFormContext<SharedFormValues>();
  return (
    <FormField
      control={form.control}
      name={`sessionTypes.${index}.amount`}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input
              {...field}
              type="number"
              min={0}
              className="text-right tabular-nums"
              aria-label={`${sessionName} amount`}
              value={field.value ?? ""}
              // Empty is null, not undefined: react-hook-form turns undefined back into the default.
              onChange={(event) =>
                field.onChange(event.target.value === "" ? null : Number(event.target.value))
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SessionTypeLabelField({ index, sessionName }: { index: number; sessionName: string }) {
  const form = useFormContext<SharedFormValues>();
  return (
    <FormField
      control={form.control}
      name={`sessionTypes.${index}.label`}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input {...field} aria-label={`${sessionName} label`} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

const SESSION_ROW_GRID =
  "grid grid-cols-[2.5rem_minmax(0,1fr)_4.75rem_2.25rem] items-start gap-x-2 gap-y-2 sm:grid-cols-[3.25rem_minmax(0,1fr)_5.5rem_2.25rem] sm:gap-x-3";

interface SessionTypesEditorProps {
  storedById: ReadonlyMap<string, HubSessionName>;
  openGroups: string[];
  onOpenGroupsChange: (groups: string[]) => void;
}

/**
 * The session types by group. A group adds rows at its end and removes its last row, so its codes
 * stay a run with no gaps. A stored row that sessions use cannot be removed.
 */
function SessionTypesEditor({
  storedById,
  openGroups,
  onOpenGroupsChange,
}: SessionTypesEditorProps) {
  const form = useFormContext<SharedFormValues>();
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "sessionTypes" });
  const { errors } = useFormState({ control: form.control, name: "sessionTypes" });
  const codes = assignSessionCodes(fields, storedById);

  const groups = (Object.keys(SESSION_TYPE_GROUPS) as SessionTypeGroup[])
    .map((type) => ({
      type,
      ...SESSION_TYPE_GROUPS[type],
      rows: fields.flatMap((field, index) => (field.type === type ? [{ field, index }] : [])),
    }))
    .filter((group) => group.rows.length > 0 || isHubSessionCategory(group.type));

  const addRow = (category: HubSessionCategory) => {
    const code = assignSessionCodes([...fields, { type: category }], storedById).at(-1) ?? "";
    append({ type: category, ...newSessionTypeDefaults(category, code) });
  };

  return (
    <Accordion
      type="multiple"
      value={openGroups}
      onValueChange={onOpenGroupsChange}
      className="rounded-lg border"
    >
      {groups.map((group) => {
        const errorCount = group.rows.filter(({ index }) => errors.sessionTypes?.[index]).length;
        const last = group.rows.at(-1);
        const lastStored = last?.field.sessionNameId
          ? storedById.get(last.field.sessionNameId)
          : undefined;
        const lastInUse = (lastStored?.sessionCount ?? 0) > 0;
        const category = isHubSessionCategory(group.type) ? group.type : undefined;
        // Removing every row at once is only for rows not yet saved; stored ones go one at a time.
        const canRemoveAll =
          group.rows.length > 1 && group.rows.every(({ field }) => !field.sessionNameId);
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
                <div className={SESSION_ROW_GRID}>
                  <span className="pb-1 text-center text-xs font-medium text-shamiri-text-grey">
                    Code
                  </span>
                  <span className="pb-1 text-xs font-medium text-shamiri-text-grey">Label</span>
                  <span className="pb-1 text-right text-xs font-medium text-shamiri-text-grey">
                    <span className="sm:hidden">KES</span>
                    <span className="hidden sm:inline">Amount (KES)</span>
                  </span>
                  <span aria-hidden />
                  {group.rows.map(({ field, index }) => {
                    const code = codes[index] ?? "";
                    const removable = field.id === last?.field.id && !lastInUse && category;
                    return (
                      <Fragment key={field.id}>
                        <span className="flex h-9 items-center justify-center text-sm font-medium tabular-nums">
                          {code}
                        </span>
                        <SessionTypeLabelField index={index} sessionName={code} />
                        <SessionTypeAmountField index={index} sessionName={code} />
                        {removable ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-shamiri-text-dark-grey hover:bg-red-bg hover:text-shamiri-light-red focus-visible:text-shamiri-light-red"
                            aria-label={`Remove ${code}`}
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : field.id === last?.field.id && lastInUse ? (
                          <span className="flex h-9 w-9 items-center justify-center text-shamiri-text-grey">
                            <Lock aria-hidden className="h-4 w-4" />
                          </span>
                        ) : (
                          <span aria-hidden />
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              )}
              {lastInUse && last && (
                <p className="text-xs text-shamiri-text-dark-grey">
                  {codes[last.index]} is used by {lastStored?.sessionCount}{" "}
                  {lastStored?.sessionCount === 1 ? "session" : "sessions"}, so it cannot be
                  removed.
                </p>
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

function ChangedSessionCell({ change }: { change: SessionTypeChange }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-xs tabular-nums text-shamiri-text-grey">{change.code}</span>
      {change.kind === "changed" && <ValueChange from={change.label.from} to={change.label.to} />}
      {change.kind === "added" && (
        <>
          <span className="font-semibold text-foreground">{change.label}</span>
          <Badge variant="shamiri-green" className="text-xs">
            Added
          </Badge>
        </>
      )}
      {change.kind === "removed" && (
        <>
          <del className="text-shamiri-text-dark-grey">
            <span className="sr-only">removed </span>
            {change.label}
          </del>
          <Badge variant="destructive" className="text-xs">
            Removed
          </Badge>
        </>
      )}
    </span>
  );
}

function ChangedAmountCell({ change }: { change: SessionTypeChange }) {
  if (change.kind === "changed") {
    return (
      <ValueChange
        from={amountFormat.format(change.amount.from)}
        to={amountFormat.format(change.amount.to)}
        wrap={false}
      />
    );
  }
  if (change.kind === "removed") {
    return <del className="text-shamiri-text-dark-grey">{amountFormat.format(change.amount)}</del>;
  }
  return (
    <span className="font-semibold text-foreground">{amountFormat.format(change.amount)}</span>
  );
}

function HubConfirmDialog({
  open,
  title,
  summary,
  changes,
  changesHeading,
  emptyText,
  note,
  confirmLabel,
  isSaving,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  summary: ReactNode;
  changes: SessionTypeChange[];
  changesHeading: string;
  emptyText: string;
  note?: string;
  confirmLabel: string;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSaving) onOpenChange(next);
      }}
    >
      <DialogContent className="lg:w-[28rem] lg:max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-left text-shamiri-text-grey">
            {summary}
          </DialogDescription>
        </DialogHeader>
        {changes.length === 0 ? (
          <p className="text-sm">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {changesHeading}
              {changes.length > 3 && (
                <span className="font-normal text-shamiri-text-dark-grey">
                  {" "}
                  · scroll to see all
                </span>
              )}
            </p>
            <section
              aria-label={changesHeading}
              className="max-h-60 overflow-y-auto rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shamiri-new-blue/60"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9 px-3 text-xs">Session</TableHead>
                    <TableHead className="h-9 whitespace-nowrap px-3 text-right text-xs">
                      Amount (KES)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changes.map((change) => (
                    <TableRow key={`${change.kind}-${change.code}`}>
                      <TableCell className="px-3 py-2.5">
                        <ChangedSessionCell change={change} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                        <ChangedAmountCell change={change} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          </div>
        )}
        {note && <p className="text-sm text-shamiri-text-dark-grey">{note}</p>}
        <Separator className="my-2" />
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="ghost"
            type="button"
            className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Go back
          </Button>
          <Button
            type="button"
            className="text-base font-semibold leading-6"
            disabled={isSaving}
            loading={isSaving}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
          <SessionTypesSection
            storedById={noStoredSessionNames}
            openGroups={openGroups}
            onOpenGroupsChange={setOpenGroups}
            description="Keep only the session types this hub runs. Labels can be updated, and you can change the amount paid to fellows per lesson."
          />
        </div>
        <HubDialogFooter isSubmitting={form.formState.isSubmitting} onCancel={onDone} />
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
