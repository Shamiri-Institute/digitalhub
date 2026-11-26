"use client";

import {
  ArrowLeftRight,
  ArrowUpFromLine,
  ChevronRight,
  CircleCheck,
  CircleX,
  Flag,
  Play,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { TicketPriorityLevel, type ImplementerRole } from "#/db/enums";
import { Button } from "#/components/ui/button";
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
import { sentenceLabel, hasHolderActions, personName, roleLabel } from "./format";
import { RecipientOptions } from "./recipient-options";

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

// Opening a form focuses its reason, or its confirm button, without scrolling while it grows open.
const focusReason = (kind: string) =>
  requestAnimationFrame(() =>
    document
      .querySelector<HTMLElement>(`#ticket-form-${kind} :is(textarea, [data-autofocus])`)
      ?.focus({ preventScroll: true }),
  );

// Closing a form puts focus back on the control that opened it, or on the activity once an
// action has removed that control.
const focusTrigger = (kind: string | null) =>
  requestAnimationFrame(() =>
    (
      document.getElementById(`ticket-action-${kind}`) ?? document.getElementById("activity")
    )?.focus(),
  );

export function TicketNextStep({
  ticket,
  actions,
  role,
  recipients,
  reassignRecipients,
  reopenableUntil,
  timeZone,
}: {
  ticket: FullTicket;
  actions: TicketActions;
  role: ImplementerRole;
  recipients: TicketPerson[];
  reassignRecipients: TicketPerson[];
  reopenableUntil: Date | null;
  timeZone: string | null;
}) {
  const [openKind, setOpenKind] = useState<ReasonAction["kind"] | "start" | null>(null);
  // A form stays mounted once opened, so closing it can animate and a draft survives a re-open.
  const [opened, setOpened] = useState<(ReasonAction["kind"] | "start")[]>([]);
  const [isStarting, startTransition] = useTransition();
  const available = nextStepActions.filter((action) => actions[action.allowed]);

  const toggle = (kind: ReasonAction["kind"] | "start") => {
    if (openKind === kind) return close();
    setOpenKind(kind);
    setOpened((kinds) => (kinds.includes(kind) ? kinds : [...kinds, kind]));
    focusReason(kind);
  };
  const close = () => {
    setOpenKind(null);
    focusTrigger(openKind);
  };
  // A finished action's form unmounts, so it reopens with the ticket's new priority and recipients.
  const done = () => {
    setOpened((kinds) => kinds.filter((kind) => kind !== openKind));
    close();
  };

  const start = () =>
    startTransition(async () => {
      const result = await startTicket(ticket.id);
      toast({ variant: result.success ? "default" : "destructive", description: result.message });
      if (result.success) close();
    });

  return (
    <section aria-labelledby="next-step" className="border-t">
      <h2
        id="next-step"
        className="border-b border-shamiri-new-lighter-blue bg-shamiri-new-light-blue px-4 py-2.5 font-semibold text-shamiri-new-blue"
      >
        {hasHolderActions(actions) ? "Your next step" : "Your ticket"}
      </h2>
      <ul className="divide-y">
        {actions.canStart && (
          <Drawer
            kind="start"
            isOpen={openKind === "start"}
            row={
              <ActionRow
                kind="start"
                icon={Play}
                tone="text-shamiri-new-blue"
                label="Start"
                outcome={`Let ${personName(ticket.createdBy)} know you're on it`}
                expanded={openKind === "start"}
                onClick={() => toggle("start")}
              />
            }
          >
            {opened.includes("start") && (
              <div className="space-y-3 text-sm">
                <p className="text-pretty text-shamiri-text-dark-grey">
                  This ticket will show as In progress.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" type="button" disabled={isStarting} onClick={close}>
                    Not yet
                  </Button>
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
              </div>
            )}
          </Drawer>
        )}
        {available.map((action) => (
          <Drawer
            key={action.kind}
            kind={action.kind}
            isOpen={openKind === action.kind}
            row={
              <ActionRow
                kind={action.kind}
                icon={action.icon}
                tone={action.tone}
                label={action.label}
                outcome={action.outcome({
                  ticket,
                  role,
                  recipients,
                  reopenableUntil:
                    reopenableUntil && timeZone && formatDateTimeIn(reopenableUntil, timeZone),
                })}
                expanded={openKind === action.kind}
                onClick={() => toggle(action.kind)}
              />
            }
          >
            {opened.includes(action.kind) && (
              <ReasonForm
                ticket={ticket}
                action={action}
                role={role}
                recipients={action.kind === "reassign" ? reassignRecipients : recipients}
                close={close}
                done={done}
              />
            )}
          </Drawer>
        ))}
      </ul>
    </section>
  );
}

function Drawer({
  kind,
  isOpen,
  row,
  children,
}: {
  kind: string;
  isOpen: boolean;
  row: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className={cn("transition-colors", isOpen && "bg-background-secondary")}>
      {row}
      <div
        id={`ticket-form-${kind}`}
        inert={!isOpen}
        className={cn(
          "grid duration-200 ease-out motion-reduce:transition-none",
          // Shown at once on opening so its field can take focus; hidden only once it has shrunk shut.
          isOpen
            ? "visible grid-rows-[1fr] opacity-100 transition-[grid-template-rows,opacity]"
            : "invisible grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity,visibility]",
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pl-12">{children}</div>
        </div>
      </div>
    </li>
  );
}

function ActionRow({
  kind,
  icon: Icon,
  tone,
  label,
  outcome,
  expanded,
  onClick,
}: {
  kind: string;
  icon: LucideIcon;
  tone: string;
  label: string;
  outcome: string;
  expanded: boolean;
  onClick: () => void;
}) {
  const outcomeId = useId();
  return (
    <button
      type="button"
      id={`ticket-action-${kind}`}
      aria-label={label}
      aria-describedby={outcomeId}
      aria-expanded={expanded}
      aria-controls={`ticket-form-${kind}`}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-shamiri-new-blue",
        !expanded && "hover:bg-background-secondary",
      )}
    >
      <Icon aria-hidden className={cn("h-5 w-5 shrink-0", tone)} />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-shamiri-black">{label}</span>
        <span id={outcomeId} className="block text-pretty text-shamiri-text-dark-grey">
          {outcome}
        </span>
      </span>
      <ChevronRight
        aria-hidden
        className={cn(
          "h-4 w-4 shrink-0 text-shamiri-text-dark-grey transition-transform duration-200 motion-reduce:transition-none",
          expanded ? "rotate-90" : "group-hover:translate-x-0.5",
        )}
      />
    </button>
  );
}

function ReasonForm({
  ticket,
  action,
  role,
  recipients,
  close,
  done,
}: {
  ticket: FullTicket;
  action: ReasonAction;
  role: ImplementerRole;
  recipients: TicketPerson[];
  close: () => void;
  done: () => void;
}) {
  const picksRecipient = ["escalate", "reopen", "reassign"].includes(action.kind);
  const [isSaving, startSaving] = useTransition();
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

  const onSubmit = (values: ReasonFormValues) =>
    startSaving(async () => {
      const result = await action.submit(ticket.id, values);
      toast({ variant: result.success ? "default" : "destructive", description: result.message });
      if (result.success) done();
    });

  return (
    <Form {...form}>
      <form
        noValidate
        aria-label={action.label}
        onSubmit={toastOnError(form.handleSubmit(onSubmit))}
        className="space-y-4"
      >
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
                    <SelectContent>
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
                  <SelectContent>
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
                    if (e.key === "Escape") close();
                  }}
                  placeholder={action.placeholder}
                  className="min-h-[100px] bg-white"
                  disabled={isSaving}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" disabled={isSaving} onClick={close}>
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
      </form>
    </Form>
  );
}
