"use client";
import { CaseReports } from "#/app/(platform)/screenings/[caseId]/components/case-reports-upload";
import { TreatmentPlan } from "#/app/(platform)/screenings/[caseId]/components/treatment-plan";
import { GenerateProgressNotes } from "#/app/(platform)/screenings/[caseId]/generate_progress_notes";
import { CurrentCase } from "#/app/(platform)/screenings/screen";
import { Card } from "#/components/ui/card";
import { cn } from "#/lib/utils";
import { useState } from "react";

export function CaseNotePlan({
  currentSupId,
  currentcase,
}: {
  currentSupId: string;
  currentcase: CurrentCase;
}) {
  const [selected, setSelected] = useState<string>(
    currentcase.progressNotes ? "Progress Notes" : "",
  );
  return (
    <>
      <Card className="my-1 flex rounded-sm">
        <CaseNotePlanOption
          option="Progress Notes"
          selected={selected}
          setSelected={setSelected}
        />
        <CaseNotePlanOption
          option="Treatment Plan"
          selected={selected}
          setSelected={setSelected}
        />
        <CaseNotePlanOption
          option="Case Reports"
          selected={selected}
          setSelected={setSelected}
        />
      </Card>
      {selected === "Progress Notes" && (
        <div className="mt-4">
          <GenerateProgressNotes currentcase={currentcase} />
        </div>
      )}
      {selected === "Treatment Plan" && (
        <div className="mt-4">
          <TreatmentPlan currentcase={currentcase} />
        </div>
      )}

      {selected === "Case Reports" && (
        <div className="mt-4">
          <CaseReports currentcase={currentcase} />
        </div>
      )}
    </>
  );
}

function CaseNotePlanOption({
  option,
  selected,
  setSelected,
}: {
  option: string;
  selected: string;
  setSelected: (option: string) => void;
}) {
  return (
    <button
      className={cn(
        " flex-1 rounded-sm px-3 py-4 even:border-x-2",
        selected === option && "bg-shamiri-blue",
      )}
      onClick={() => setSelected(option)}
    >
      <p className="text-xs font-medium text-brand">{option}</p>
    </button>
  );
}
