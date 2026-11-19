import { TEAM_LABELS } from "#/db/enums";
import { SelectGroup, SelectItem, SelectLabel } from "#/components/ui/select";
import type { TicketPerson } from "#/lib/actions/ticket/types";
import { personName, roleLabel } from "./format";

function groupLabel(person: TicketPerson) {
  if (person.role === "ADMIN") return person.team ? `${TEAM_LABELS[person.team]} team` : "No team";
  return person.role ? roleLabel(person.role) : "Other";
}

// Groups keep the routing's order, so the default stays first.
export function RecipientOptions({ people }: { people: TicketPerson[] }) {
  const groups = new Map<string, TicketPerson[]>();
  for (const person of people) {
    const label = groupLabel(person);
    groups.set(label, [...(groups.get(label) ?? []), person]);
  }
  return [...groups].map(([label, members]) => (
    <SelectGroup key={label}>
      <SelectLabel>{label}</SelectLabel>
      {members.map((person) => (
        <SelectItem key={person.userId} value={person.userId}>
          {personName(person)}
        </SelectItem>
      ))}
    </SelectGroup>
  ));
}
