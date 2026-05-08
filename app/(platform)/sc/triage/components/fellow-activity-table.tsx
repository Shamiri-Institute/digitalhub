import type { TriageEventForSupervisor } from "#/app/(platform)/sc/triage/action";
import FellowActivitySummaryRow from "#/app/(platform)/sc/triage/components/fellow-activity-summary-row";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "#/components/ui/table";

export default function FellowActivityTable({
  events,
  supervisorId,
}: {
  events: TriageEventForSupervisor[];
  supervisorId: string;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-shamiri-text-grey">No triage events from your fellows yet.</p>
      </div>
    );
  }

  // Group events by fellow
  const byFellow = events.reduce<
    Record<string, { name: string; events: TriageEventForSupervisor[] }>
  >((acc, e) => {
    const id = e.fellowId;
    if (!acc[id]) acc[id] = { name: e.fellow.fellowName ?? id, events: [] };
    acc[id].events.push(e);
    return acc;
  }, {});

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Fellow</TableHead>
            <TableHead>Total events</TableHead>
            <TableHead>Breakdown</TableHead>
            <TableHead>Referred to others</TableHead>
            <TableHead>Screen completion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(byFellow).map(([fellowId, { name, events: fellowEvents }]) => (
            <FellowActivitySummaryRow
              key={fellowId}
              fellowName={name}
              supervisorId={supervisorId}
              events={fellowEvents}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
