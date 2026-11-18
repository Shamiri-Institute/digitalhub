import type { TicketPerson } from "#/lib/actions/ticket/types";
import { cn } from "#/lib/utils";
import { personName, roleLabel } from "./format";

export function Person({
  person,
  viewerId,
  emphasis = true,
}: {
  person: TicketPerson;
  viewerId: string | null;
  emphasis?: boolean;
}) {
  const isViewer = person.userId === viewerId;
  return (
    <span>
      <span
        className={cn(
          emphasis && "font-semibold",
          isViewer ? "text-shamiri-new-blue" : "text-shamiri-black",
        )}
      >
        {personName(person, viewerId)}
      </span>
      {person.role && !isViewer && (
        <span className="text-sm text-shamiri-text-dark-grey"> · {roleLabel(person.role)}</span>
      )}
    </span>
  );
}
