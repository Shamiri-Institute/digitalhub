"use client";

import {
  ArrowLeftRight,
  ArrowUpFromLine,
  ChevronDown,
  CircleCheck,
  CircleX,
  Flag,
  Lock,
  MessageSquare,
  Play,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { TicketPriorityLevel, type ImplementerRole } from "#/db/enums";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
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
import { Textarea } from "#/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { toast, toastOnError } from "#/components/ui/use-toast";
import {
  cancelTicket,
  changeTicketPriority,
  createEscalation,
  reassignTicket,
  reopenTicket,
  resolveTicket,
  startTicket,
} from "#/lib/actions/ticket";
import {
  type FullTicket,
  type TicketPerson,
  type TicketActions,
  TicketPriorityLevelEnum,
} from "#/lib/actions/ticket/types";
import { formatDateTimeIn } from "#/lib/date-utils";
import { cn, stringValidation } from "#/lib/utils";
import { zodResolver } from "#/lib/zod-resolver";
import type { ActionResponse } from "#/types/actions.types";
import { sentenceLabel, personName, roleLabel } from "./format";
import { RecipientOptions } from "./recipient-options";
import { TicketCommentForm } from "./ticket-comment-form";

const ReasonFormSchema = z.object({
  reason: stringValidation("A reason is required"),
  priority: TicketPriorityLevelEnum,
  recipientId: z.string(),
});
type ReasonFormValues = z.infer<typeof ReasonFormSchema>;

type ReasonAction = {
  kind: "resolve" | "escalate" | "reassign" | "changePriority" | "reopen" | "cancel";
  label: string;
  placeholder: string;
  destructive?: boolean;
  submit: (ticketId: string, values: ReasonFormValues) => Promise<ActionResponse>;
};

type NextStepAction = ReasonAction & {
  allowed: keyof TicketActions;
  icon: LucideIcon;
  // Matches the colour of the event the action adds to the activity.
  tone: string;
  outcome: (context: {
    ticket: FullTicket;
    role: ImplementerRole;
    recipients: TicketPerson[];
    reopenableUntil: string | null;
  }) => string;
};

const nextStepActions: NextStepAction[] = [
  {
    kind: "resolve",
    allowed: "canResolve",
    label: "Resolve",
    icon: CircleCheck,
    tone: "text-shamiri-green",
    outcome: () => "Close it with a note on the fix",
    placeholder: "How was this resolved?",
    submit: (ticketId, { reason }) => resolveTicket(ticketId, reason),
  },
  {
    kind: "escalate",
    allowed: "canEscalate",
    label: "Escalate",
    icon: ArrowUpFromLine,
    tone: "text-shamiri-light-red",
    outcome: ({ recipients }) => {
      const [first] = recipients;
      if (!first) return "No one is available to take it";
      if (recipients.length === 1) return `Send it to ${personName(first)}`;
      const label = first.role ? roleLabel(first.role).toLowerCase() : "person";
      return `Choose ${/^[aeiou]/.test(label) ? "an" : "a"} ${label} to send it to`;
    },
    placeholder: "Why does this need to go up a tier?",
    submit: (ticketId, { reason, recipientId }) => createEscalation(ticketId, reason, recipientId),
  },
  {
    kind: "reassign",
    allowed: "canReassign",
    label: "Reassign",
    icon: ArrowLeftRight,
    tone: "text-shamiri-text-dark-grey",
    outcome: ({ role }) => `Hand it to another ${roleLabel(role).toLowerCase()}`,
    placeholder: "Why should they take it over?",
    submit: (ticketId, { reason, recipientId }) =>
      reassignTicket({ ticketId, reassignedTo: recipientId, reassignmentReason: reason }),
  },
  {
    kind: "changePriority",
    allowed: "canChangePriority",
    label: "Change priority",
    icon: Flag,
    tone: "text-shamiri-dark-orange",
    outcome: ({ ticket }) => `Currently ${sentenceLabel(ticket.priority).toLowerCase()}`,
    placeholder: "Why is the priority changing?",
    submit: (ticketId, { reason, priority }) =>
      changeTicketPriority(ticketId, { priority, reason }),
  },
  {
    kind: "reopen",
    allowed: "canReopen",
    label: "Reopen",
    icon: RotateCcw,
    tone: "text-shamiri-dark-orange",
    outcome: ({ reopenableUntil }) =>
      reopenableUntil ? `You can reopen until ${reopenableUntil}` : "Send it back to be worked on",
    placeholder: "What still needs to be done?",
    submit: (ticketId, { reason, recipientId }) => reopenTicket(ticketId, reason, recipientId),
  },
  {
    kind: "cancel",
    allowed: "canCancel",
    label: "Cancel ticket",
    icon: CircleX,
    tone: "text-shamiri-text-dark-grey",
    outcome: () => "Withdraw it if it's no longer needed",
    placeholder: "Why is this ticket no longer needed?",
    destructive: true,
    submit: (ticketId, { reason }) => cancelTicket(ticketId, reason),
  },
];

type Mode = ReasonAction["kind"] | "comment" | "start";

const modeClass = (chosen: boolean, recommended: boolean) =>
  cn(
    "flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-3 text-sm font-medium text-shamiri-text-dark-grey transition-colors hover:bg-transparent hover:text-shamiri-black focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue data-[state=on]:bg-white data-[state=on]:text-shamiri-black max-sm:h-11",
    recommended && "font-semibold text-shamiri-black",
    chosen && "border-border bg-white text-shamiri-black shadow-xs",
  );

// Switching mode focuses the new form's first field, so the keyboard follows the choice.
const focusMode = () =>
  requestAnimationFrame(() =>
    document
      .querySelector<HTMLElement>(
        "#ticket-composer-form > :not([hidden]) :is(textarea, [role=combobox], [data-autofocus])",
      )
      ?.focus({ preventScroll: true }),
  );

/**
 * The bar pinned to the bottom of the ticket page: a comment box, and each action the viewer may
 * take as another mode of the same box, so no action needs a dialog or a scroll to reach.
 */
export function TicketComposer({
  ticket,
  actions,
  role,
  recipients,
  reassignRecipients,
  reopenableUntil,
  timeZone,
  contained,
}: {
  ticket: FullTicket;
  actions: TicketActions;
  role: ImplementerRole;
  recipients: TicketPerson[];
  reassignRecipients: TicketPerson[];
  reopenableUntil: Date | null;
  timeZone: string | null;
  /** Centre the bar's content in the page container; off inside a layout that has one. */
  contained: boolean;
}) {
  const available = nextStepActions.filter((action) => actions[action.allowed]);
  const modes: { kind: Mode; label: string; icon: LucideIcon; tone: string }[] = [
    ...(actions.canComment
      ? [{ kind: "comment" as const, label: "Comment", icon: MessageSquare, tone: "" }]
      : []),
    ...(actions.canStart
      ? [{ kind: "start" as const, label: "Start", icon: Play, tone: "text-shamiri-new-blue" }]
      : []),
    ...available,
  ];
  const [mode, setMode] = useState<Mode | null>(modes[0]?.kind ?? null);
  const [isStarting, startTransition] = useTransition();
  if (modes.length === 0 || mode === null) {
    return (
      <p
        className={cn(
          "flex items-center gap-2 border-t bg-background-secondary py-3 text-sm text-shamiri-text-dark-grey",
          contained && "container",
        )}
      >
        <Lock aria-hidden className="h-4 w-4 shrink-0" />
        This ticket is closed, so no more comments can be added.
      </p>
    );
  }

  const current = modes.find((m) => m.kind === mode) ?? modes[0];
  const action = available.find((a) => a.kind === current?.kind);
  // The row holds Comment, the step that moves the ticket on, and the handovers; the rest wait
  // under More, unless there's only one of them.
  const recommended = (["start", "resolve", "reopen"] as const).find((kind) =>
    modes.some((m) => m.kind === kind),
  );
  const inRow = (kind: Mode) =>
    kind === "comment" || kind === recommended || kind === "escalate" || kind === "reassign";
  const overflow = modes.filter((m) => !inRow(m.kind));
  const rowModes = overflow.length > 1 ? modes.filter((m) => inRow(m.kind)) : modes;
  const moreModes = overflow.length > 1 ? overflow : [];
  const inMore = moreModes.some((m) => m.kind === current?.kind);
  // On phones only Comment and the next step sit beside More, so the row fits without scrolling.
  const others = modes.filter((m) => m.kind !== "comment" && m.kind !== recommended);
  const phoneMoreModes = others.length > 1 ? others : [];
  const inPhoneMore = phoneMoreModes.some((m) => m.kind === current?.kind);
  const menuModes = modes.filter((m) => moreModes.includes(m) || phoneMoreModes.includes(m));
  const menuLabel = (chosen: boolean) =>
    chosen && current ? (
      <>
        <current.icon aria-hidden className={cn("h-4 w-4", current.tone)} />
        {current.label}
      </>
    ) : (
      "More"
    );
  const choose = (kind: Mode) => {
    setMode(kind);
    focusMode();
  };
  // A finished or discarded action hands the box back to its first mode.
  const reset = () => setMode(modes[0]?.kind ?? null);

  const start = () =>
    startTransition(async () => {
      const result = await startTicket(ticket.id);
      toast({ variant: result.success ? "default" : "destructive", description: result.message });
      if (result.success) reset();
    });

  return (
    <section
      aria-label="Comment and actions"
      className="sticky bottom-0 z-10 border-t bg-white shadow-[0_-6px_16px_rgb(0_0_0/0.04)]"
    >
      <div className={cn("space-y-2.5 py-3", contained && "container")}>
        {modes.length > 1 && (
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 gap-1 rounded-lg border bg-background-secondary p-0.5">
              <ToggleGroup
                type="single"
                aria-label="What to do"
                value={inMore ? "" : (current?.kind ?? "")}
                // A single toggle group lets its pressed item be unpressed; a mode stays chosen.
                onValueChange={(kind) => kind && choose(kind as Mode)}
                className="gap-1"
              >
                {rowModes.map(({ kind, label, icon: Icon, tone }) => (
                  <ToggleGroupItem
                    key={kind}
                    value={kind}
                    aria-controls="ticket-composer-form"
                    className={cn(
                      modeClass(kind === current?.kind, kind === recommended),
                      phoneMoreModes.some((m) => m.kind === kind) && "max-sm:hidden",
                    )}
                  >
                    <Icon aria-hidden className={cn("h-4 w-4", tone)} />
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {menuModes.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      modeClass(inMore, false),
                      inPhoneMore &&
                        "max-sm:border-border max-sm:bg-white max-sm:text-shamiri-black max-sm:shadow-xs",
                      moreModes.length === 0 && "sm:hidden",
                    )}
                  >
                    <span className="contents sm:hidden">{menuLabel(inPhoneMore)}</span>
                    <span className="contents max-sm:hidden">{menuLabel(inMore)}</span>
                    <ChevronDown aria-hidden className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    // Focus goes to the chosen mode's form, not back to the trigger.
                    onCloseAutoFocus={(e) => e.preventDefault()}
                  >
                    <DropdownMenuRadioGroup
                      value={current?.kind}
                      onValueChange={(kind) => choose(kind as Mode)}
                    >
                      {menuModes.map(({ kind, label, icon: Icon, tone }) => (
                        <DropdownMenuRadioItem
                          key={kind}
                          value={kind}
                          className={cn(
                            "gap-1.5 max-sm:py-3",
                            !moreModes.some((m) => m.kind === kind) && "sm:hidden",
                          )}
                        >
                          <Icon aria-hidden className={cn("h-4 w-4", tone)} />
                          {label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {action && (
              <p className="hidden truncate text-sm text-shamiri-text-dark-grey md:block">
                {action.outcome({
                  ticket,
                  role,
                  recipients,
                  reopenableUntil:
                    reopenableUntil && timeZone && formatDateTimeIn(reopenableUntil, timeZone),
                })}
              </p>
            )}
          </div>
        )}
        {/* Every mode stays mounted and only the current one shows, so switching keeps each draft. */}
        <div id="ticket-composer-form">
          {modes.map(({ kind }) => {
            const reasonAction = available.find((a) => a.kind === kind);
            return (
              <div key={kind} hidden={kind !== current?.kind}>
                {kind === "comment" ? (
                  <TicketCommentForm ticketId={ticket.id} />
                ) : kind === "start" ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <p className="text-pretty text-shamiri-text-dark-grey">
                      Let {personName(ticket.createdBy)} know you&apos;re on it. This ticket will
                      show as In progress.
                    </p>
                    <Button
                      data-autofocus
                      variant="brand"
                      type="button"
                      disabled={isStarting}
                      loading={isStarting}
                      onClick={start}
                    >
                      Start ticket
                    </Button>
                  </div>
                ) : (
                  reasonAction && (
                    <ReasonForm
                      ticket={ticket}
                      action={reasonAction}
                      role={role}
                      recipients={
                        reasonAction.kind === "reassign" ? reassignRecipients : recipients
                      }
                      close={reset}
                    />
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ReasonForm({
  ticket,
  action,
  role,
  recipients,
  close,
}: {
  ticket: FullTicket;
  action: ReasonAction;
  role: ImplementerRole;
  recipients: TicketPerson[];
  close: () => void;
}) {
  const picksRecipient = ["escalate", "reopen", "reassign"].includes(action.kind);
  const [isSaving, startSaving] = useTransition();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const form = useForm<ReasonFormValues>({
    resolver: zodResolver(
      ReasonFormSchema.refine(
        (v) => action.kind !== "changePriority" || v.priority !== ticket.priority,
        {
          message: "Choose a different priority",
          path: ["priority"],
        },
      ).refine((v) => !picksRecipient || v.recipientId !== "", {
        message: "Choose who should take it",
        path: ["recipientId"],
      }),
    ),
    defaultValues: {
      reason: "",
      priority: ticket.priority,
      // The routing's default comes first; a reassign is a deliberate handover, so has none.
      recipientId: action.kind === "reassign" ? "" : (recipients[0]?.userId ?? ""),
    },
  });
  const noRecipients = picksRecipient && recipients.length === 0;

  const discard = () => {
    form.reset();
    setConfirmingDiscard(false);
    close();
  };

  const onSubmit = (values: ReasonFormValues) =>
    startSaving(async () => {
      const result = await action.submit(ticket.id, values);
      toast({ variant: result.success ? "default" : "destructive", description: result.message });
      if (result.success) discard();
    });

  return (
    <Form {...form}>
      <form
        noValidate
        aria-label={action.label}
        onSubmit={toastOnError(form.handleSubmit(onSubmit))}
        className="space-y-3"
      >
        <div className="grid gap-3 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
          {picksRecipient && (
            <FormField
              control={form.control}
              name="recipientId"
              render={({ field }) => (
                <FormItem required className="space-y-3">
                  <FormLabel className="text-sm">
                    {action.kind === "reassign"
                      ? `Reassign to another ${roleLabel(role).toLowerCase()}`
                      : "Send to"}
                  </FormLabel>
                  {noRecipients ? (
                    <p className="text-sm text-shamiri-text-dark-grey">
                      No one is available to take this ticket. Ask an administrator for help.
                    </p>
                  ) : (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Choose who should take it" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        <RecipientOptions people={recipients} />
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {action.kind === "changePriority" && (
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem required className="space-y-3">
                  <FormLabel className="text-sm">Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      {Object.values(TicketPriorityLevel).map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {sentenceLabel(priority)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem required className="space-y-3">
                <FormLabel className="text-sm">Reason</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") e.currentTarget.blur();
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                        e.currentTarget.form?.requestSubmit();
                    }}
                    placeholder={action.placeholder}
                    className="min-h-16 bg-white field-sizing-content max-h-48"
                    disabled={isSaving}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {confirmingDiscard ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-background-secondary px-3 py-2 text-sm">
            <p className="min-w-0 flex-1 text-pretty text-shamiri-text-dark-grey">
              Discard the reason you wrote?
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmingDiscard(false)}>
                Keep writing
              </Button>
              <Button type="button" variant="destructive" onClick={discard}>
                Discard reason
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              type="button"
              disabled={isSaving}
              onClick={() =>
                form.getValues("reason").trim() ? setConfirmingDiscard(true) : discard()
              }
            >
              Discard
            </Button>
            <Button
              variant={action.destructive ? "destructive" : "brand"}
              type="submit"
              disabled={noRecipients || isSaving}
              loading={isSaving}
            >
              {action.label}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
