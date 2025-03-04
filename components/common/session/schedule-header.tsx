import CountWidget from "#/app/(platform)/hc/components/count-widget";
import PageHeading from "#/components/ui/page-heading";

export function ScheduleHeader({
  stats,
}: {
  stats: {
    title: string;
    count: number;
  }[];
}) {
  return (
    <div className="flex items-center justify-between">
      <PageHeading title="Schedule" />
      <CountWidget stats={stats} />
    </div>
  );
}
