"use client";

import { ArrowRight, Trash2 } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

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
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { Separator } from "#/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { toast } from "#/components/ui/use-toast";
import {
  assignSessionCodes,
  type HubSessionCategory,
  isHubSessionCategory,
  newSessionTypeDefaults,
  SESSION_TYPE_GROUPS,
  type SessionTypeGroup,
} from "#/lib/app-constants/hub-session-types";
import { cn } from "#/lib/utils";
import type { ActionResponse } from "#/types/actions.types";
import type { HubSessionName } from "../queries";

export type FormSessionType = {
  sessionNameId?: string;
  type: SessionTypeGroup;
  label: string;
  amount: number;
};
type SharedFormValues = { hubName: string; sessionTypes: FormSessionType[] };

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

export function withCodes(
  rows: FormSessionType[],
  storedById: ReadonlyMap<string, { sessionName: string }>,
): CodedSessionType[] {
  const codes = assignSessionCodes(rows, storedById);
  return rows.map((row, index) => ({
    code: codes[index] ?? "",
    label: row.label.trim(),
    amount: row.amount,
  }));
}

export function diffSessionTypes(
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

export const sessionTypeCount = (count: number) =>
  `${count} session ${count === 1 ? "type" : "types"}`;

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

export function useConfirmedSave<T>(
  action: (values: T) => Promise<ActionResponse>,
  onDone?: () => void,
) {
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
      onDone?.();
    } finally {
      setIsSaving(false);
    }
  };

  return { pending, setPending, isSaving, confirm };
}

export function HubNameField({ storedName }: { storedName?: string }) {
  const { control } = useFormContext<SharedFormValues>();
  return (
    <FormField
      control={control}
      name="hubName"
      render={({ field }) => (
        <FormItem required>
          <FormLabel>Hub name</FormLabel>
          <FormControl>
            <Input {...field} autoComplete="off" />
          </FormControl>
          <FormDescription>
            {storedName !== undefined && field.value.trim() !== storedName && (
              <span className="font-medium">was {storedName} · </span>
            )}
            Must be unique among this project&apos;s hubs.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SessionTypeAmountField({ index, code, stored }: FieldProps) {
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
              aria-label={`${code} amount`}
              value={field.value ?? ""}
              // Empty is null, not undefined: react-hook-form turns undefined back into the default.
              onChange={(event) =>
                field.onChange(event.target.value === "" ? null : Number(event.target.value))
              }
            />
          </FormControl>
          {stored && field.value !== stored.amount && (
            <FormDescription className="text-right text-xs">
              was {amountFormat.format(stored.amount)}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SessionTypeLabelField({ index, code, stored }: FieldProps) {
  const form = useFormContext<SharedFormValues>();
  return (
    <FormField
      control={form.control}
      name={`sessionTypes.${index}.label`}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input {...field} aria-label={`${code} label`} />
          </FormControl>
          {stored && field.value.trim() !== stored.sessionLabel && (
            <FormDescription className="text-xs">was {stored.sessionLabel}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

type FieldProps = { index: number; code: string; stored?: HubSessionName };

export const SESSION_ROW_GRID =
  "grid grid-cols-[2.5rem_minmax(0,1fr)_4.75rem_2.25rem] items-start gap-x-2 gap-y-2 sm:grid-cols-[3.25rem_minmax(0,1fr)_5.5rem_2.25rem] sm:gap-x-3";

/**
 * The form's session types by group, with every code. A group adds rows at its end and removes
 * its last row, so its codes stay a run with no gaps.
 */
export function useSessionTypeGroups(storedById: ReadonlyMap<string, { sessionName: string }>) {
  const form = useFormContext<SharedFormValues>();
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "sessionTypes" });
  const codes = assignSessionCodes(fields, storedById);

  const groups = (Object.keys(SESSION_TYPE_GROUPS) as SessionTypeGroup[])
    .map((type) => ({
      type,
      ...SESSION_TYPE_GROUPS[type],
      category: isHubSessionCategory(type) ? type : undefined,
      rows: fields.flatMap((field, index) =>
        field.type === type ? [{ field, index, code: codes[index] ?? "" }] : [],
      ),
    }))
    .filter((group) => group.rows.length > 0 || group.category);

  const addRow = (category: HubSessionCategory) => {
    const code = assignSessionCodes([...fields, { type: category }], storedById).at(-1) ?? "";
    append({ type: category, ...newSessionTypeDefaults(category, code) });
  };

  return { groups, addRow, remove };
}

type SessionTypeGroupRows = ReturnType<typeof useSessionTypeGroups>["groups"][number];

/**
 * One group's rows: code, label, amount, and a remove button. Only the group's last row can be
 * removed, and not when sessions use it; any other row's button says why it is disabled.
 */
export function SessionTypeRows({
  group,
  storedById,
  onRemove,
}: {
  group: SessionTypeGroupRows;
  storedById: ReadonlyMap<string, HubSessionName>;
  onRemove: (index: number) => void;
}) {
  const last = group.rows.at(-1);
  return (
    <div className={SESSION_ROW_GRID}>
      <span className="pb-1 text-center text-xs font-medium text-shamiri-text-grey">Code</span>
      <span className="pb-1 text-xs font-medium text-shamiri-text-grey">Label</span>
      <span className="pb-1 text-right text-xs font-medium text-shamiri-text-grey">
        <span className="sm:hidden">KES</span>
        <span className="hidden sm:inline">Amount (KES)</span>
      </span>
      <span aria-hidden />
      {group.rows.map(({ field, index, code }) => {
        const stored = field.sessionNameId ? storedById.get(field.sessionNameId) : undefined;
        const sessionCount = stored?.sessionCount ?? 0;
        const removeBlockedBy =
          sessionCount > 0
            ? `${code} is used by ${sessionCount} ${sessionCount === 1 ? "session" : "sessions"}, so it cannot be removed.`
            : field.id !== last?.field.id
              ? `Only the last ${group.noun} can be removed.`
              : undefined;
        return (
          <Fragment key={field.id}>
            <span className="flex h-9 items-center justify-center text-sm font-medium tabular-nums">
              {code}
            </span>
            <SessionTypeLabelField index={index} code={code} stored={stored} />
            <SessionTypeAmountField index={index} code={code} stored={stored} />
            {!group.category ? (
              <span aria-hidden />
            ) : removeBlockedBy ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-disabled
                    aria-label={`Remove ${code}`}
                    aria-describedby={`${field.id}-remove-blocked`}
                    className="cursor-not-allowed text-shamiri-text-grey opacity-50 hover:bg-transparent hover:text-shamiri-text-grey"
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                    <span id={`${field.id}-remove-blocked`} className="sr-only">
                      {removeBlockedBy}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{removeBlockedBy}</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-shamiri-text-dark-grey hover:bg-red-bg hover:text-shamiri-light-red focus-visible:text-shamiri-light-red"
                aria-label={`Remove ${code}`}
                onClick={() => onRemove(index)}
              >
                <Trash2 aria-hidden className="h-4 w-4" />
              </Button>
            )}
          </Fragment>
        );
      })}
    </div>
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

export function HubConfirmDialog({
  open,
  title,
  summary,
  changes,
  changesHeading,
  emptyText,
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
