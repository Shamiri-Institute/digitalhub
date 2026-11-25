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
// The clinical team role names a group, so one of them is a member.
export function roleLabel(role: ImplementerRole) {
  if (role === "HUB_COORDINATOR") return "Hub manager";
  if (role === "CLINICAL_TEAM") return "Clinical team member";
  return sentenceLabel(role);
}

export function sentenceLabel(value: string) {
  const label = enumLabel(value);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const priorityBadgeVariant: Partial<Record<TicketPriorityLevel, BadgeProps["variant"]>> = {
  HIGH: "warning",
  URGENT: "destructive",
};

export function personName(person: TicketPerson, viewerId?: string | null) {
  if (viewerId && person.userId === viewerId) return "You";
  return person.name ?? "Unknown";
}

export const hasHolderActions = (actions: TicketActions) =>
  actions.canStart ||
  actions.canResolve ||
  actions.canEscalate ||
  actions.canReassign ||
  actions.canChangePriority;
