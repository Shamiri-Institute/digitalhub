"use client";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import { useState } from "react";

export default function GeneralIssues() {
  const [selected, setSelected] = useState<string>("");
  const [other, setOther] = useState<string>("");

  const handleOther = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOther(e.target.value);
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
            option="Academic challenges"
            selected={selected}
            setSelected={setSelected}
          />
          <GeneralOption
            option="Family issues"
            selected={selected}
            setSelected={setSelected}
          />
          <GeneralOption
            option="Peer pressure"
            selected={selected}
            setSelected={setSelected}
          />
        </div>
        <div className="my-1 flex gap-2">
          <GeneralOption
            option="Romantic r/ship issues"
            selected={selected}
            setSelected={setSelected}
          />
          <GeneralOption
            option="Self-esteem issues"
            selected={selected}
            setSelected={setSelected}
          />
          <GeneralOption
            option="Other"
            selected={selected}
            setSelected={setSelected}
          />
        </div>
      </div>

      {selected === "Other" && (
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
