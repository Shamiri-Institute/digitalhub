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
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <PageHeading title="Schedule" />
      <CountWidget stats={stats} />
    </div>
  );
}
