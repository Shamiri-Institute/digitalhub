import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import {
  isHubSessionCategory,
  SESSION_TYPE_GROUPS,
  type SessionTypeGroup,
} from "#/lib/app-constants/hub-session-types";
import type { HubSessionName } from "../queries";
import {
  HUB_DETAILS_DESCRIPTION,
  SESSION_TYPES_DESCRIPTION,
  SessionGroupHeading,
  SettingsSection,
} from "./hub-settings-layout";

/** The hub settings for an admin who is not a super admin: the same values, as text. */
export default function HubSettingsView({
  hubName,
  sessionNames,
}: {
  hubName: string;
  sessionNames: HubSessionName[];
}) {
  const amountFormat = new Intl.NumberFormat("en-US");
  const groups = (Object.keys(SESSION_TYPE_GROUPS) as SessionTypeGroup[])
    .map((type) => ({
      type,
      ...SESSION_TYPE_GROUPS[type],
      rows: sessionNames.filter((n) => n.sessionType === type),
    }))
    .filter((group) => group.rows.length > 0 || isHubSessionCategory(group.type));

  return (
    <div>
      <SettingsSection title="Hub details" description={HUB_DETAILS_DESCRIPTION}>
        <dl className="space-y-1">
          <dt className="text-sm font-medium">Hub name</dt>
          <dd className="text-sm text-muted-foreground">{hubName}</dd>
        </dl>
      </SettingsSection>
      <SettingsSection title="Session types" description={SESSION_TYPES_DESCRIPTION}>
        {groups.map((group) => (
          <div key={group.type} className="space-y-2">
            <SessionGroupHeading label={group.label} count={group.rows.length} />
            {group.rows.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                No {group.noun}s at this hub.
              </p>
            ) : (
              <div className="rounded-lg border">
                <Table aria-label={group.label}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Code</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead className="text-right">Amount (KES)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium tabular-nums">
                          {row.sessionName}
                        </TableCell>
                        <TableCell>{row.sessionLabel}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {amountFormat.format(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ))}
      </SettingsSection>
    </div>
  );
}
