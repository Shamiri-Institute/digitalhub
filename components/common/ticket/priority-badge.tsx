import type { TicketPriorityLevel, TicketStatus } from "#/db/enums";
import { Badge } from "#/components/ui/badge";
import { ACTIVE_TICKET_STATUSES } from "#/lib/actions/ticket/types";
import { priorityBadgeVariant, sentenceLabel } from "./format";

// Only high and urgent get a badge, so they stand out, and only while the ticket still needs work.
export function PriorityBadge({
  priority,
  status,
}: {
  priority: TicketPriorityLevel;
  status: TicketStatus;
}) {
  const variant = ACTIVE_TICKET_STATUSES.includes(status) && priorityBadgeVariant[priority];
  const label = sentenceLabel(priority);
  return variant ? (
    <Badge variant={variant} className="select-none">
      {label}
    </Badge>
  ) : (
    label
  );
}
