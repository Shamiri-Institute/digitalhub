import { CASE_STATUS_COLORS } from "#/components/charts/constants";
import { getClinicalCasesStats } from "../action";

export default async function ClinicalCasesStats() {
  const { totalCases, completedCases, followUpCases, activeCases } = await getClinicalCasesStats();
  const segments = [
    { label: "active", count: activeCases, color: CASE_STATUS_COLORS.Active },
    { label: "Follow-up", count: followUpCases, color: CASE_STATUS_COLORS.FollowUp },
    { label: "Terminated", count: completedCases, color: CASE_STATUS_COLORS.Terminated },
  ];

  return (
    <div className="flex w-full flex-1 flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Total Cases: {totalCases}</span>
        <div className="flex items-center gap-2 divide-x divide-border">
          {segments.map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-2 pl-2 first:pl-0">
              <svg aria-hidden="true" className="size-2" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="4" fill={color} />
              </svg>
              <span className="text-sm font-medium">
                {count} {label}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* Segment widths are case counts in the viewBox, so the bar needs no inline style. */}
      <svg
        aria-hidden="true"
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        viewBox={`0 0 ${Math.max(totalCases, 1)} 1`}
        preserveAspectRatio="none"
      >
        {segments.map(({ label, count, color }, index) => (
          <rect
            key={label}
            x={segments.slice(0, index).reduce((offset, segment) => offset + segment.count, 0)}
            width={count}
            height="1"
            fill={color}
          />
        ))}
      </svg>
    </div>
  );
}
