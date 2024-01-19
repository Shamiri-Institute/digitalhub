"use client";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";
import { useState } from "react";

export function CaseNotePlan({
  currentSupId
}: {
  currentSupId: string
}) {
  const [selected, setSelected] = useState<string>("");
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
          <ProgressNotes />
        </div>
      )}
      {selected === "Treatment Plan" && (
        <div className="mt-4">
          <TreatmentPlan />
        </div>
      )}

      {selected === "Case Reports" && (
        <div className="mt-4">
          <CaseReports />
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

function ProgressNotes() {

  const handleFileGeneration = () => {
    console.log("File generated");
  }

  return (
    <Button className="hover:bg-shamiri-brand w-full rounded-sm bg-shamiri-blue px-3 py-2 text-white" onClick={handleFileGeneration}>
      <Icons.upload className="mr-2 h-4 w-4" />
      Generate File
    </Button>
  );
}

function TreatmentPlan() {
  return (
    <>
      <Input id="csv-file" name="csv-file" type="file" accept="text/csv" />
      <Button className="hover:bg-shamiri-brand mt-2 w-full rounded-sm bg-shamiri-blue px-3 py-2 text-white">
        <Icons.upload className="mr-2 h-4 w-4" />
        Upload File
      </Button>
    </>
  );
}

function CaseReports() {
  return (
    <>
      <Input id="csv-file" name="csv-file" type="file" accept="text/csv" />
      <Button className="hover:bg-shamiri-brand mt-2 w-full rounded-sm bg-shamiri-blue px-3 py-2 text-white">
        <Icons.upload className="mr-2 h-4 w-4" />
        Upload File
      </Button>
    </>
  );
}
