import { CurrentCase } from "#/app/(platform)/screenings/screen";
import { updateClinicalCaseGeneralPresentingIssue } from "#/app/actions";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";

import { useState } from "react";


export default function GeneralIssues({
  currentcase,
}: {
  currentcase: CurrentCase;
}) {

  console.log({ currentcase });


  const [selected, setSelected] = useState<CurrentCase>(currentcase)
  const [other, setOther] = useState<string>(
    currentcase.generalPresentingIssuesOtherSpecified || "",
  );

  const handleOther = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOther(e.target.value);
  };

  const handleOption = async (option: {
    [key: string]: boolean
  }) => {

    console.log({ option })
    setSelected({
      ...selected,
      ...option,
    })

    try {
      if (!option.others) {
        await updateClinicalCaseGeneralPresentingIssue(
          currentcase.id,
          option,
          other,
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleOtherOption = async () => {
    try {
      if (other.trim() === currentcase.generalPresentingIssuesOtherSpecified) {
        return;
      }
      // await updateClinicalCaseGeneralPresentingIssue(
      //   currentcase.id,
      //   // selected,
      //   other.trim(),
      // );
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <Separator className="mt-4" />
      <h3 className="mb-2 mt-3 text-sm font-medium text-muted-foreground">
        General
      </h3>

      <div className="flex flex-col">
        <div className="my-1 flex gap-2">
          <GeneralOption
            option="Academic Struggles"
            valKey="academicStruggles"
            selected={selected?.academicStruggles ?? false}
            setSelected={handleOption}
          />

          <GeneralOption
            option="Home Environment"
            valKey="homeEnvironment"
            selected={selected?.homeEnvironment ?? false}
            setSelected={handleOption}
          />
          <GeneralOption
            option="Anxiety"
            selected={selected?.anxiety ?? false}
            valKey="anxiety"
            setSelected={handleOption}
          />

        </div>
        <div className="my-1 flex gap-2">
          <GeneralOption
            option="Blended Family Dynamics"
            valKey="blendedFamilyDynamics"
            selected={selected?.blendedFamilyDynamics ?? false}
            setSelected={handleOption}
          />
          <GeneralOption
            option="Parent-Child Relationships"
            valKey="parentChildRelationships"
            selected={selected?.parentChildRelationships ?? false}
            setSelected={handleOption}
          />
          <GeneralOption
            option="Student-Teacher Relationships"
            valKey="studentTeacherRelationships"
            selected={selected?.studentTeacherRelationships ?? false}
            setSelected={handleOption}
          />

        </div>
        <div className="my-1 flex gap-2">
          <GeneralOption
            option="Unresolved Grief/Loss"
            valKey="unresolvedGriefLoss"
            selected={selected?.unresolvedGriefLoss ?? false}
            setSelected={handleOption}
          />
          <GeneralOption
            option="Medical Condition"
            valKey="medicalCondition"
            selected={selected?.medicalCondition ?? false}
            setSelected={handleOption}
          />
          <GeneralOption
            option="Self-Perception"
            valKey="selfPerception"
            selected={selected?.selfPerception ?? false}
            setSelected={handleOption}
          />

        </div>

        <div className="my-1 flex gap-2">
          <GeneralOption
            option="Self-Regulation"
            valKey="selfRegulation"
            selected={selected?.selfRegulation ?? false}
            setSelected={handleOption}
          />
          <GeneralOption
            option="Peer Relationships"
            valKey="peerRelationships"
            selected={selected?.peerRelationships ?? false}
            setSelected={handleOption}
          />

          <GeneralOption
            option="Sexuality/ Sexual Identity"
            selected={selected.sexuality ?? false}
            setSelected={handleOption}
            valKey="sexuality"
          />
        </div>
        <div className="my-1 flex gap-2">
          <GeneralOption
            option="Others"
            valKey="others"
            selected={other ? true : false}
            setSelected={handleOption}
          />

        </div>
      </div>

      {selected.generalPresentingIssuesOtherSpecified && (
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
          <Button
            onClick={handleOtherOption}
            variant="brand"
            className="mt-2 w-full"
            disabled={
              other.trim() === currentcase.generalPresentingIssuesOtherSpecified
            }
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
  valKey,
}: {
  option: string;
  selected: boolean;
  valKey: string;
  setSelected: (option: {
    [key: string]: boolean;
  }
  ) => void;
}) {
  return (
    <Card
      className={cn(
        "flex flex-1 rounded-sm",
        selected && "bg-shamiri-blue",
      )}
    >
      <button className="flex-1 px-3 py-4" onClick={() => setSelected({ [valKey]: !selected })}
      >
        <p className="text-xs font-medium text-brand">{option} {JSON.stringify(selected)}</p>
      </button>
    </Card>
  );
}

