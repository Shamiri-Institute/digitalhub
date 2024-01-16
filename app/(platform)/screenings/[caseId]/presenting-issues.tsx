"use client";
import { updateClinicalCaseEmergencyPresentingIssue } from "#/app/actions";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import {
  ClinicalScreeningInfo,
  ClinicalSessionAttendance,
  Prisma,
  Student,
} from "@prisma/client";
import { useState } from "react";
import GeneralIssues from "./general-issues";

type CurrentCase = ClinicalScreeningInfo & {
  student: Student;
  sessions: ClinicalSessionAttendance[];
};
export function PresentingIssues({
  currentcase,
}: {
  currentcase: CurrentCase;
}) {
  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
        Emergency
      </h3>
      <Separator />
      <DiagnosingBoard currentcase={currentcase} />
      <GeneralIssues currentcase={currentcase} />
    </div>
  );
}

const emergency_options = [
  { id: 1, name: "Child Abuse" },
  { id: 2, name: "Self-harm/Suicidality" },
  { id: 3, name: "Sexual Abuse" },
  { id: 4, name: "Bullying" },
  { id: 5, name: "Substance Abuse" },
];

function DiagnosingBoard({ currentcase }: { currentcase: CurrentCase }) {
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
        <IssueOptions
          emergency_options={currentcase.emergencyPresentingIssues}
          caseId={currentcase.id}
          key={option.id}
          name={option.name}
        />
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

function IssueOptions({
  name,
  caseId,
  emergency_options = {},
}: {
  name: string;
  caseId: string;
  emergency_options: { [key: string]: string } | Prisma.JsonValue | null;
}) {
  if (!emergency_options) {
    emergency_options = {};
  }

  const [selected, setSelected] = useState<string>(
    emergency_options[name] ?? "",
  );

  const handlePresentingIssue = async (option: string) => {
    let valueSelected = { name, option };

    let result = { [valueSelected.name]: valueSelected.option };
    try {
      if (option === selected) {
        setSelected("");

        await updateClinicalCaseEmergencyPresentingIssue({
          caseId: caseId,
          presentingIssues: {
            ...result,
            [valueSelected.name]: "",
          },
        });
        return;
      } else {
        setSelected(option);
        await updateClinicalCaseEmergencyPresentingIssue({
          caseId: caseId,
          presentingIssues: {
            ...result,
          },
        });
      }
    } catch (error) {
      console.log(error);
    }
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
