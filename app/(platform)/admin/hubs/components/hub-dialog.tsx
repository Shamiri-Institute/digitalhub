"use client";

import { ArrowRight } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
import {
  type FieldErrors,
  useFieldArray,
  useForm,
  useFormContext,
  useFormState,
} from "react-hook-form";
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
import { hubSessionTypes, type HubSessionType } from "#/lib/app-constants/hub-session-types";
import { cn } from "#/lib/utils";
import { zodResolver } from "#/lib/zod-resolver";
import type { AdminHub } from "../queries";

type CreateFormValues = z.infer<typeof CreateHubSchema>;
type EditFormValues = z.infer<typeof EditHubFormSchema>;
type SessionTypeGroup = HubSessionType["type"];
/** The part of the create and edit forms that the shared fields read. */
type SharedFormValues = {
  hubName: string;
  sessionTypes: { name: string; label: string; amount: number }[];
};

const SESSION_TYPE_GROUP_LABELS: Record<HubSessionType["type"], string> = {
  INTERVENTION: "Intervention sessions",
  SUPERVISION: "Supervision sessions",
  TRAINING: "Training sessions",
  SPECIAL: "Special sessions",
  CLINICAL: "Clinical sessions",
  DATA_COLLECTION: "Data follow-up sessions",
};

const SESSION_TYPE_GROUP_ORDER: HubSessionType["type"][] = [
  "INTERVENTION",
  "SUPERVISION",
  "TRAINING",
  "SPECIAL",
  "CLINICAL",
  "DATA_COLLECTION",
];

const standardTypeByName = new Map<string, SessionTypeGroup>(
  hubSessionTypes.map((sessionType) => [sessionType.name, sessionType.type]),
);

/** The standard session types, to be edited before the hub is created. */
const defaultSessionTypes = hubSessionTypes.map(({ name, label, amount }) => ({
  name,
  label,
  amount,
}));

const amountFormat = new Intl.NumberFormat("en-US");

type SessionTypeChange = {
  name: string;
  label: { from: string; to: string };
  amount: { from: number; to: number };
};

/** Session types of a new hub whose label or amount the admin edited, for the confirmation. */
function customizedSessionTypes(
  sessionTypes: CreateFormValues["sessionTypes"],
): SessionTypeChange[] {
  return sessionTypes.flatMap((row) => {
    const preset = hubSessionTypes.find((t) => t.name === row.name);
    if (!preset || (row.label === preset.label && row.amount === preset.amount)) return [];
    return [
      {
        name: row.name,
        label: { from: preset.label, to: row.label },
        amount: { from: preset.amount, to: row.amount },
      },
    ];
  });
}

/** Session types of an existing hub whose saved label or amount will change. */
function changedSessionTypes(
  sessionTypes: EditFormValues["sessionTypes"],
  stored: HubSessionName[],
): SessionTypeChange[] {
  const storedById = new Map(stored.map((n) => [n.id, n]));
  return sessionTypes.flatMap((row) => {
    const saved = storedById.get(row.sessionNameId);
    if (!saved || (row.label === saved.sessionLabel && row.amount === saved.amount)) return [];
    return [
      {
        name: row.name,
        label: { from: saved.sessionLabel, to: row.label },
        amount: { from: saved.amount, to: row.amount },
      },
    ];
  });
}

const formatAmount = (amount: number) => amountFormat.format(amount);

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

/** The groups that hold a row with a validation error, so they can be opened to show it. */
function groupsWithErrors(
  sessionTypeErrors: unknown,
  sessionTypes: { name: string }[],
  typeByName: ReadonlyMap<string, SessionTypeGroup>,
) {
  if (!Array.isArray(sessionTypeErrors)) return [];
  const groups = sessionTypeErrors.flatMap((rowErrors, index) => {
    const group = rowErrors ? typeByName.get(sessionTypes[index]?.name ?? "") : undefined;
    return group ? [group] : [];
  });
  return [...new Set(groups)];
}

interface HubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The hub being edited, with its stored session names. Leave it out to add a new hub. */
  edit?: { hub: AdminHub; sessionNames: HubSessionName[] };
}

export default function HubDialog({ open, onOpenChange, edit }: HubDialogProps) {
  const onDone = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,calc(100dvh-2rem))] flex-col lg:w-[42rem] lg:max-w-[calc(100vw-2rem)]">
        {edit ? (
          <EditHubForm hub={edit.hub} sessionNames={edit.sessionNames} onDone={onDone} />
        ) : (
          <CreateHubForm onDone={onDone} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Both forms hold a hub name, so the field reads it from the surrounding form. */
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
        name: n.sessionName,
        label: n.sessionLabel,
        amount: n.amount,
      })),
    },
  });
  const typeByName = new Map(sessionNames.map((n) => [n.sessionName, n.sessionType]));
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  // A closed group does not show its errors, so open the groups that have one.
  const onInvalid = (errors: FieldErrors<EditFormValues>) => {
    const failing = groupsWithErrors(
      errors.sessionTypes,
      form.getValues("sessionTypes"),
      typeByName,
    );
    setOpenGroups((open) => [...new Set([...open, ...failing])]);
  };

  const [pending, setPending] = useState<EditFormValues | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const changes = pending ? changedSessionTypes(pending.sessionTypes, sessionNames) : [];
  const renamed = pending !== null && pending.hubName !== hub.hubName;

  const confirmSave = async () => {
    if (!pending) return;
    setIsSaving(true);
    try {
      const response = await updateHub({ hubId: hub.id, ...pending });
      // Close the confirmation either way, so the admin can see the message and fix the form.
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

  return (
    <Form {...form}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={toastOnError(form.handleSubmit(setPending, onInvalid))}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl">Edit hub</DialogTitle>
          <DialogDescription className="text-left text-shamiri-text-grey">
            Rename the hub, or change its session labels and amounts. Session codes cannot change.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1.5 py-4">
          <HubNameField />
          {sessionNames.length > 0 && (
            <SessionTypesSection
              typeByName={typeByName}
              openGroups={openGroups}
              onOpenGroupsChange={setOpenGroups}
              description="Change a session's label, or the amount paid to fellows per lesson."
            />
          )}
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
        emptyText="Session labels and amounts stay as they are."
        note={
          changes.some((change) => change.amount.from !== change.amount.to)
            ? "Attendance marked after the save is paid at the new amount. Payouts already recorded keep their amount, including when attendance is unmarked."
            : undefined
        }
        confirmLabel="Save changes"
        isSaving={isSaving}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        onConfirm={toastOnError(confirmSave)}
      />
    </Form>
  );
}

function SessionTypesSection({
  typeByName,
  openGroups,
  onOpenGroupsChange,
  description,
}: {
  typeByName: ReadonlyMap<string, SessionTypeGroup>;
  openGroups: string[];
  onOpenGroupsChange: (groups: string[]) => void;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label className="text-base">Session types</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <SessionTypesEditor
        typeByName={typeByName}
        openGroups={openGroups}
        onOpenGroupsChange={onOpenGroupsChange}
      />
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

function SessionTypesEditor({
  typeByName,
  openGroups,
  onOpenGroupsChange,
}: {
  typeByName: ReadonlyMap<string, SessionTypeGroup>;
  openGroups: string[];
  onOpenGroupsChange: (groups: string[]) => void;
}) {
  const form = useFormContext<SharedFormValues>();
  const { fields } = useFieldArray({ control: form.control, name: "sessionTypes" });
  const { errors } = useFormState({ control: form.control, name: "sessionTypes" });

  const groups = SESSION_TYPE_GROUP_ORDER.map((type) => ({
    type,
    label: SESSION_TYPE_GROUP_LABELS[type],
    rows: fields.flatMap((field, index) =>
      typeByName.get(field.name) === type ? [{ field, index }] : [],
    ),
  })).filter((group) => group.rows.length > 0);

  return (
    <Accordion
      type="multiple"
      value={openGroups}
      onValueChange={onOpenGroupsChange}
      className="rounded-lg border"
    >
      {groups.map((group) => {
        const errorCount = group.rows.filter(({ index }) => errors.sessionTypes?.[index]).length;
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
                  <span className="text-shamiri-new-blue">
                    {group.rows.length} {group.rows.length === 1 ? "type" : "types"}
                  </span>
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_5.5rem] items-start gap-x-3 gap-y-2">
                <span className="pb-1 text-xs font-medium text-shamiri-text-grey">Code</span>
                <span className="pb-1 text-xs font-medium text-shamiri-text-grey">Label</span>
                <span className="pb-1 text-right text-xs font-medium text-shamiri-text-grey">
                  Amount (KES)
                </span>
                {group.rows.map(({ field, index }) => (
                  <Fragment key={field.id}>
                    <span className="pt-2 text-sm font-medium tabular-nums">{field.name}</span>
                    <SessionTypeLabelField index={index} sessionName={field.name} />
                    <SessionTypeAmountField index={index} sessionName={field.name} />
                  </Fragment>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

/** The last step before a hub is saved: what will be stored, and the session types it edits. */
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
  /** Names the listed rows, for the heading and for screen readers. */
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
      // Closing while the request runs would let the form be submitted a second time.
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
                    <TableRow key={change.name}>
                      <TableCell className="px-3 py-2.5">
                        <ValueChange from={change.label.from} to={change.label.to} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                        <ValueChange
                          from={formatAmount(change.amount.from)}
                          to={formatAmount(change.amount.to)}
                          wrap={false}
                        />
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
  // The validated values wait here while the admin confirms, and are what gets submitted.
  const [pending, setPending] = useState<CreateFormValues | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const changes = pending ? customizedSessionTypes(pending.sessionTypes) : [];

  // A closed group does not show its errors, so open the groups that have one.
  const onInvalid = (errors: FieldErrors<CreateFormValues>) => {
    const failing = groupsWithErrors(
      errors.sessionTypes,
      form.getValues("sessionTypes"),
      standardTypeByName,
    );
    setOpenGroups((open) => [...new Set([...open, ...failing])]);
  };

  const confirmCreate = async () => {
    if (!pending) return;
    setIsCreating(true);
    try {
      const response = await createHub(pending);
      // Close the confirmation either way, so the admin can see the message and fix the form.
      setPending(null);
      if (!response.success) {
        toast({ variant: "destructive", description: response.message });
        return;
      }
      toast({ description: response.message });
      onDone();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Form {...form}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={toastOnError(form.handleSubmit(setPending, onInvalid))}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl">Add a new hub</DialogTitle>
          <DialogDescription className="text-left text-shamiri-text-grey">
            Name the hub, then review its session types. Expand a group to change a label or an
            amount.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1.5 py-4">
          <HubNameField />
          <SessionTypesSection
            typeByName={standardTypeByName}
            openGroups={openGroups}
            onOpenGroupsChange={setOpenGroups}
            description="Session labels can be updated, and you can change the amount paid to fellows per lesson."
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
        changesHeading={`${sessionTypeCount(changes.length)} with custom values`}
        emptyText="Labels and fellow pay amounts will be saved as shown."
        confirmLabel="Create hub"
        isSaving={isCreating}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        onConfirm={toastOnError(confirmCreate)}
      />
    </Form>
  );
}
