import CountWidget from "#/app/(platform)/hc/components/count-widget";
import PageHeading from "#/components/ui/page-heading";

export function ScheduleHeader({
  sessions,
  fellows,
  cases,
}: {
  sessions: number;
  fellows: number;
  cases: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <PageHeading title="Schedule" />
      <CountWidget sessions={sessions} fellows={fellows} cases={cases} />
    </div>
  );
}
