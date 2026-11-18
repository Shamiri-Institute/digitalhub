import type { ImplementerRole, TicketPriorityLevel, TicketStatus } from "#/db/enums";
import type { BadgeProps } from "#/components/ui/badge";
import type { TicketActions, TicketPerson } from "#/lib/actions/ticket/types";
import { enumLabel } from "#/lib/utils";

export const prioritiesLowToHigh: TicketPriorityLevel[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const statusBadgeVariant: Record<TicketStatus, BadgeProps["variant"]> = {
  OPEN: "outline-solid",
  IN_PROGRESS: "default",
  ESCALATED: "destructive",
  RESOLVED: "shamiri-green",
  CLOSED: "secondary",
  CANCELLED: "secondary",
};

// Everyone who runs a hub has the hub coordinator role, and the UI calls them all hub managers.
export function roleLabel(role: ImplementerRole) {
  const label = role === "HUB_COORDINATOR" ? "hub manager" : enumLabel(role);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function capitalise(value: string) {
  const label = enumLabel(value);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const priorityBadgeVariant: Partial<Record<TicketPriorityLevel, BadgeProps["variant"]>> = {
  HIGH: "warning",
  URGENT: "destructive",
};

/** The person's name, or "You" when they are the viewer. */
export function personName(person: TicketPerson, viewerId?: string) {
  if (viewerId && person.userId === viewerId) return "You";
  return person.name ?? "Unknown";
}

/** Whether the viewer holds the ticket and can act on it, so it shows them a next step. */
export const holdsTicket = (actions: TicketActions) =>
  actions.canStart ||
  actions.canResolve ||
  actions.canEscalate ||
  actions.canReassign ||
  actions.canChangePriority;
