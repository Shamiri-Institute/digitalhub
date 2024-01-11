import { updateClinicalCaseGeneralPresentingIssue } from "#/app/actions";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import { ClinicalScreeningInfo, ClinicalSessionAttendance, Student } from "@prisma/client";
import { useState } from "react";

type CurrentCase = ClinicalScreeningInfo & {
  student: Student
  sessions: ClinicalSessionAttendance[]
}

export default function GeneralIssues({ currentcase }: { currentcase: CurrentCase }) {
  const [selected, setSelected] = useState<string>(currentcase.generalPresentingIssues || "");
  const [other, setOther] = useState<string>(currentcase.generalPresentingIssuesOtherSpecified || "");

  const handleOther = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOther(e.target.value);
  };

  const handleOption = async (option: string) => {
    setSelected(option);
    try {
      if (option !== "Other") {
        await updateClinicalCaseGeneralPresentingIssue(
          currentcase.id,
          option,
          other
        )
      }

    } catch (error) {
      console.log(error);
    }
  }

  const handleOtherOption = async () => {
    try {

      if (other.trim() === currentcase.generalPresentingIssuesOtherSpecified) {
        return;
      }
      await updateClinicalCaseGeneralPresentingIssue(
        currentcase.id,
        selected,
        other.trim()
      )
    } catch (error) {
      console.log(error);
    }
  }


  return (
    <div>
      <Separator className="mt-4" />
      <h3 className="mb-2 mt-3 text-sm font-medium text-muted-foreground">
        General
      </h3>
      <div className="flex flex-col">
        <div className="my-1 flex gap-2">
          <GeneralOption
            option="Academic challenges"
            selected={selected}
            setSelected={handleOption}
          />
          <GeneralOption
            option="Family issues"
            selected={selected}
            setSelected={handleOption}
          />
          <GeneralOption
            option="Peer pressure"
            selected={selected}
            setSelected={handleOption}
          />
        </div>
        <div className="my-1 flex gap-2">
          <GeneralOption
            option="Romantic r/ship issues"
            selected={selected}
            setSelected={handleOption}
          />
          <GeneralOption
            option="Self-esteem issues"
            selected={selected}
            setSelected={handleOption}
          />
          <GeneralOption
            option="Other"
            selected={selected}
            setSelected={handleOption}
          />
        </div>
      </div>

      {selected === "Other" && (
        <>
          <div className="mt-2 px-[1px]">
            <Input
              id="other"
              name="other"
              type="text"
              value={other}
              onChange={handleOther}
              placeholder="Other? Type here"
              className="resize-none bg-card"
            />
          </div>
          <Button onClick={handleOtherOption} variant="brand" className="w-full mt-2"
            disabled={other.trim() === currentcase.generalPresentingIssuesOtherSpecified}
          >
            Add Note
          </Button>
        </>
      )}
    </div>
  );
}

function GeneralOption({
  option,
  selected,
  setSelected,
}: {
  option: string;
  selected: string;
  setSelected: (option: string) => void;
}) {
  return (
    <Card
      className={cn(
        "flex flex-1 rounded-sm",
        selected === option && "bg-shamiri-blue",
      )}
    >
      <button className="flex-1 px-3 py-4" onClick={() => setSelected(option)}>
        <p className="text-xs font-medium text-brand">{option}</p>
      </button>
    </Card>
  );
}
