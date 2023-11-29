
"use client"
import { useState } from "react";
import { cn } from "#/lib/utils";
import { Card } from "#/components/ui/card";
import { Button } from "#/components/ui/button";
import { Icons } from "#/components/icons";
import { Input } from "#/components/ui/input";

export function CaseNotePlan() {
    const [selected, setSelected] = useState<string>("")
    return (
        <>
            <Card className="flex my-1 rounded-sm">
                <CaseNotePlanOption option="Progress Notes" selected={selected} setSelected={setSelected} />
                <CaseNotePlanOption option="Treatment Plan" selected={selected} setSelected={setSelected} />
                <CaseNotePlanOption option="Case Reports" selected={selected} setSelected={setSelected} />
            </Card>
            {selected === "Progress Notes" && <div className="mt-4">
                <ProgressNotes />
            </div>}
            {selected === "Treatment Plan" && <div className="mt-4">
                <TreatmentPlan />
            </div>}

            {selected === "Case Reports" && <div className="mt-4">
                <CaseReports />
            </div>}
        </>
    );
}

function CaseNotePlanOption({ option, selected, setSelected }: { option: string; selected: string; setSelected: (option: string) => void }) {
    return (
        <button className={cn(" py-4 px-3 rounded-sm flex-1 even:border-x-2",
            selected === option && "bg-shamiri-blue"
        )}
            onClick={() => setSelected(option)}
        >
            <p className="text-xs text-brand font-medium">
                {option}
            </p>
        </button>
    )
}

function ProgressNotes() {
    return (
        <Button className="bg-shamiri-blue text-white rounded-sm px-3 py-2 w-full hover:bg-shamiri-brand">
            <Icons.upload className="w-4 h-4 mr-2" />
            Generate File
        </Button>
    )
}

function TreatmentPlan() {
    return (
        <>
            <Input id="csv-file" name="csv-file" type="file" accept="text/csv" />
            <Button className="bg-shamiri-blue text-white rounded-sm px-3 py-2 w-full hover:bg-shamiri-brand mt-2">
                <Icons.upload className="w-4 h-4 mr-2" />
                Upload File
            </Button>
        </>
    )
}

function CaseReports() {
    return (
        <>
            <Input id="csv-file" name="csv-file" type="file" accept="text/csv" />
            <Button className="bg-shamiri-blue text-white rounded-sm px-3 py-2 w-full hover:bg-shamiri-brand mt-2">
                <Icons.upload className="w-4 h-4 mr-2" />
                Upload File
            </Button>
        </>
    )
}