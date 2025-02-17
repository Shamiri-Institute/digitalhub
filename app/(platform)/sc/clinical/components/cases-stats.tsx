export default function ClinicalCasesStats() {
  const totalCases = 100;
  const completedCases = 75;

  return (
    <div className="flex w-full flex-1 flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Total Cases: {totalCases}</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-shamiri-green"></div>
            <span className="text-sm font-medium">8 active</span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-shamiri-light-orange"></div>
            <span className="text-sm font-medium">2 Follow-up</span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-shamiri-light-red"></div>
            <span className="text-sm font-medium">5 Terminated</span>
          </div>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-shamiri-light-red-background-base/30">
        <div
          className="h-full rounded-full bg-shamiri-green"
          style={{
            width: `${(completedCases / totalCases) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
