"use client";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import { useState } from "react";
import GeneralIssues from "./general-issues";

export function PresentingIssues() {
  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
        Emergency
      </h3>
      <Separator />
      <DiagnosingBoard />
      <GeneralIssues />
    </div>
  );
}

const emergency_options = [
  { id: 1, name: "Anxiety" },
  { id: 2, name: "Self-harm" },
  { id: 3, name: "Stress" },
  { id: 4, name: "Bullying" },
  { id: 5, name: "Sexual abuse" },
  { id: 5, name: "Suicidality" },
];

function DiagnosingBoard() {
  return (
    <div>
      <div className="mt-4 flex justify-between">
        <div className="flex-1" />
        <div className="ml-2 flex flex-1 justify-between">
          <div>
            <p className="text-xs font-medium text-brand">No</p>
          </div>
          <div>
            <p className="text-xs font-medium text-brand">Low</p>
          </div>
          <div className="">
            <p className="text-xs font-medium text-brand">Med</p>
          </div>
          <div>
            <p className="text-xs font-medium text-brand">High</p>
          </div>
        </div>
      </div>
      {emergency_options.map((option) => (
        <IssueOptions key={option.id} name={option.name} />
      ))}
    </div>
  );
}

function SingleIssueOption({
  onSelect = (f) => f,
  selected,
  option,
}: {
  selected: string;
  onSelect: (option: string) => void;
  option: string;
}) {
  return (
    <div className="flex">
      <button
        className={cn(
          "mr-1 h-6 w-6 rounded-full bg-[#d9d9d9]",
          selected === option && "bg-brand",
        )}
        onClick={() => onSelect(option)}
      />
    </div>
  );
}

function IssueOptions({ name }: { name: string }) {
  const [selected, setSelected] = useState<string>("");

  const handlePresentingIssue = (option: string) => {
    // TODO: API CALL - name is the presenting issue
    let valueSelected = { name, option };
    setSelected(option);
  };

  return (
    <div className="mt-2 flex justify-between">
      <div className="flex-1">
        <Card className="w-fit rounded-sm px-4 py-2 text-center shadow-none">
          <p className="min-w-[8.5rem] text-xs font-medium text-brand">
            {name}
          </p>
        </Card>
      </div>
      <div className="flex flex-1 justify-between">
        {["No", "Low", "Med", "High"].map((option, i) => (
          <SingleIssueOption
            key={i}
            selected={selected}
            onSelect={handlePresentingIssue}
            option={option}
          />
        ))}
      </div>
    </div>
  );
}
