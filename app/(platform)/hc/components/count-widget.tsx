export default function CountWidget({
  stats,
}: {
  stats: {
    title: string;
    count: number;
  }[];
}) {
  return (
    <div className="relative flex items-center justify-between divide-x divide-[#E8E8E8] rounded-lg border border-[#E8E8E8] bg-[#F7F7F7] font-normal">
      {stats.map((stat, index) => {
        return (
          <div
            key={stat.title}
            className="flex flex-col items-center justify-center px-4 py-2"
          >
            <div className="text-sm text-gray-500">{stat.title}</div>
            <div className="text-xl text-black">{stat.count}</div>
          </div>
        );
      })}
    </div>
  );
}
