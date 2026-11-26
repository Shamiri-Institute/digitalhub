import { Fragment } from "react";

import { TEAM_LABELS } from "#/db/enums";
import { SelectGroup, SelectItem, SelectLabel, SelectSeparator } from "#/components/ui/select";
import type { TicketPerson } from "#/lib/actions/ticket/types";
import { personName, roleLabel } from "./format";

export function groupLabel(person: TicketPerson) {
  if (person.role === "ADMIN") return person.team ? `${TEAM_LABELS[person.team]} team` : "No team";
  return person.role ? roleLabel(person.role) : "Other";
}

export function recipientLabels(people: TicketPerson[]) {
  return Object.fromEntries(people.map((person) => [person.userId, personName(person)]));
}

function PersonOption({ person }: { person: TicketPerson }) {
  return <SelectItem value={person.userId}>{personName(person)}</SelectItem>;
}

// Groups keep the routing's order, so the default stays first.
export function RecipientOptions({ people }: { people: TicketPerson[] }) {
  const groups = new Map<string, TicketPerson[]>();
  for (const person of people) {
    const label = groupLabel(person);
    groups.set(label, [...(groups.get(label) ?? []), person]);
  }
  // A lone heading names nothing the field doesn't, so one group is a plain list.
  if (groups.size === 1) {
    return people.map((person) => <PersonOption key={person.userId} person={person} />);
  }
  return [...groups].map(([label, members], i) => (
    <Fragment key={label}>
      {i > 0 && <SelectSeparator />}
      <SelectGroup>
        <SelectLabel className="text-xs font-medium text-shamiri-text-dark-grey">
          {label}
        </SelectLabel>
        {members.map((person) => (
          <PersonOption key={person.userId} person={person} />
        ))}
      </SelectGroup>
    </Fragment>
  ));
}
