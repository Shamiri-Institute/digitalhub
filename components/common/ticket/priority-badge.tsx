import type { TicketPriorityLevel } from "#/db/enums";
import { Badge } from "#/components/ui/badge";
import { priorityBadgeVariant, sentenceLabel } from "./format";

// Only high and urgent get a badge, so they stand out from the rest.
export function PriorityBadge({ priority }: { priority: TicketPriorityLevel }) {
  const variant = priorityBadgeVariant[priority];
  const label = sentenceLabel(priority);
  return variant ? (
    <Badge variant={variant} className="select-none">
      {label}
    </Badge>
  ) : (
    label
  );
}
