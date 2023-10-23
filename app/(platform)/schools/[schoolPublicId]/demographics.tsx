"use client";

export function SchoolDemographics({
  malePopulation,
  femalePopulation,
  totalPopulation,
}: {
  malePopulation: number;
  femalePopulation: number;
  totalPopulation: number;
}) {
  const strokeWidth = 30;
  const radius = 100 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  const malePercentage = malePopulation / totalPopulation;
  const femalePercentage = femalePopulation / totalPopulation;

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
          // The sum of the male and female dash lengths followed by a large enough gap to not show the rest of the circle
          strokeDasharray={`${maleDashLength} ${femaleDashLength} ${circumference}`}
          // Start the male segment at the top
          strokeDashoffset="0"
        />
        <circle
          r={radius}
          cx="0"
          cy="0"
          fill="none"
          stroke="#092142"
          strokeWidth={strokeWidth}
          // Only the female dash length followed by a large enough gap to not show the rest of the circle
          strokeDasharray={`${femaleDashLength} ${circumference}`}
          // Start the female segment immediately after the male segment
          strokeDashoffset={-maleDashLength}
        />
      </svg>
    </div>
  );
}
