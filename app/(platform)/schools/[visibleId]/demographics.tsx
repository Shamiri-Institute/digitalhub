"use client";

// TODO: use recharts
export function SchoolDemographics({
  males,
  females,
  others,
}: {
  males: number;
  females: number;
  others: number;
}) {
  const strokeWidth = 30;
  const radius = 100 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  const malePercentage = 200 / 400;
  const femalePercentage = 200 / 400;

  const maleDashLength = circumference * malePercentage;
  const femaleDashLength = circumference * femalePercentage;

  return (
    <div className="flex flex-col items-center justify-center">
      <svg
        className="rotate-[-90deg] transform"
        width="220"
        height="220"
        viewBox="-110 -110 220 220"
      >
        <circle
          r={radius}
          cx="0"
          cy="0"
          fill="none"
          stroke="#B7D4E8"
          strokeWidth={strokeWidth}
          strokeDasharray={`${maleDashLength} ${femaleDashLength} ${circumference}`}
          strokeDashoffset="0"
        />
        <circle
          r={radius}
          cx="0"
          cy="0"
          fill="none"
          stroke="#092142"
          strokeWidth={strokeWidth}
          strokeDasharray={`${femaleDashLength} ${maleDashLength} ${circumference}`}
          strokeDashoffset={-maleDashLength}
        />
      </svg>
    </div>
  );
}
