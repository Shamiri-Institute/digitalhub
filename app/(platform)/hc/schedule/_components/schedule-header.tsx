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
      <div className="text-[2.25rem] font-semibold text-black">Schedule</div>
      <div className="relative flex items-center justify-between divide-x divide-[#E8E8E8] self-stretch rounded-lg border border-[#E8E8E8] bg-[#F7F7F7] font-normal">
        <div className="flex w-28 flex-col items-center justify-center py-2">
          <div className="text-sm text-gray-500">Sessions</div>
          <div className="text-xl text-black">{sessions}</div>
        </div>
        <div className="flex w-28 flex-col items-center justify-center py-2">
          <div className="text-sm text-gray-500">Fellows</div>
          <div className="text-xl text-black">{fellows}</div>
        </div>
        <div className="flex w-28 flex-col items-center justify-center py-2">
          <div className="text-sm text-gray-500">Cases</div>
          <div className="text-xl text-black">{cases}</div>
        </div>
      </div>
    </div>
  );
}
