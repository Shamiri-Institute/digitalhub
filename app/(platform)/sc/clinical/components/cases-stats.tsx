import { getClinicalCasesStats } from "../action";

export default async function ClinicalCasesStats() {
  const {
    totalCases,
    completedCases,
    followUpCases,
    activeCases,
    activeCasesPercentage,
    followUpCasesPercentage,
    completedCasesPercentage,
  } = await getClinicalCasesStats();

  return (
    <div className="flex w-full flex-1 flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Total Cases: {totalCases}</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-shamiri-green" />
            <span className="text-sm font-medium">{activeCases} active</span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-shamiri-light-orange" />
            <span className="text-sm font-medium">{followUpCases} Follow-up</span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-shamiri-light-red" />
            <span className="text-sm font-medium">{completedCases} Terminated</span>
          </div>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-shamiri-light-red-background-base/30">
        <div className="flex h-full">
          <div
            className="h-full rounded-l-full bg-shamiri-green"
            style={{
              width: `${activeCasesPercentage}%`,
            }}
          />
          <div
            className="h-full bg-shamiri-light-orange"
            style={{
              width: `${followUpCasesPercentage}%`,
            }}
          />
          <div
            className="h-full rounded-r-full bg-shamiri-light-red"
            style={{
              width: `${completedCasesPercentage}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
