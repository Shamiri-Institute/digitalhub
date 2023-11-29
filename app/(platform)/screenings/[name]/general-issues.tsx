"use client";
import { cn } from "#/lib/utils";
import { useState } from "react";
import { Input } from "#/components/ui/input";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";

export default function GeneralIssues() {
    const [selected, setSelected] = useState<string>("");
    const [other, setOther] = useState<string>("");

    const handleOther = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOther(e.target.value)
    }

    return (
        <div>
            <Separator className="mt-4" />
            <h3 className="mt-3 mb-2 text-muted-foreground text-sm font-medium">
                General
            </h3>
            <div className="flex flex-col">
                <div className="flex gap-2 my-1">
                    <GeneralOption option="Academic challenges" selected={selected} setSelected={setSelected} />
                    <GeneralOption option="Family issues" selected={selected} setSelected={setSelected} />
                    <GeneralOption option="Peer pressure" selected={selected} setSelected={setSelected} />
                </div>
                <div className="flex gap-2 my-1">
                    <GeneralOption option="Romantic r/ship issues" selected={selected} setSelected={setSelected} />
                    <GeneralOption option="Self-esteem issues" selected={selected} setSelected={setSelected} />
                    <GeneralOption option="Other" selected={selected} setSelected={setSelected} />
                </div>
            </div>

            {selected === "Other" && <div className="mt-2 px-[1px]">
                <Input
                    id="other"
                    name="other"
                    type="text"
                    value={other}
                    onChange={handleOther}
                    placeholder="Other? Type here"
                    className="resize-none bg-card"
                />
            </div>}

        </div>
    );
}

function GeneralOption({ option, selected, setSelected }: { option: string; selected: string; setSelected: (option: string) => void }) {
    return (
        <Card className={cn("flex flex-1 rounded-sm",
            selected === option && "bg-shamiri-blue")}>
            <button className="py-4 px-3 flex-1"
                onClick={() => setSelected(option)}
            >
                <p className="text-xs text-brand font-medium">
                    {option}
                </p>
            </button>
        </Card>
    )
}