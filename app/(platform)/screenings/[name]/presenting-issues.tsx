"use client"
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import { useState } from "react";
import GeneralIssues from "./general-issues";


export function PresentingIssues() {
    return (
        <div className="mt-4">
            <h3 className="mb-2 text-muted-foreground text-sm font-medium">
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

]


function DiagnosingBoard() {
    return (
        <div>
            <div className="flex justify-between mt-4">
                <div className="flex-1" />
                <div className="flex flex-1 justify-between ml-2">
                    <div >
                        <p className="text-xs text-brand font-medium">
                            No
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-brand font-medium">
                            Low
                        </p>
                    </div>
                    <div className="">
                        <p className="text-xs text-brand font-medium">
                            Med
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-brand font-medium">
                            High
                        </p>
                    </div>
                </div>
            </div>
            {
                emergency_options.map((option) => (
                    <IssueOptions key={option.id} name={option.name} />
                ))
            }


        </div>
    )

}


function SingleIssueOption({ onSelect = f => f, selected }: { selected: string; onSelect: (option: string) => void }) {

    return (
        <div className="flex ">
            <button className={cn("h-6 w-6 rounded-full bg-[#d9d9d9] mr-1",
                // selected === option && "bg-muted-pink",
                // selected === option && "bg-shamiri-light-blue"
            )}
                onClick={() => onSelect("a")}
            />

        </div>
    )
}

function IssueOptions({ name }: { name: string }) {
    const [selected, setSelected] = useState<string>("")

    return (
        <div className="flex justify-between mt-2">
            <div className="flex-1">

                <div className="bg-muted-foreground px-4 py-2 text-center rounded-sm w-fit" >
                    <p className="text-xs text-brand font-medium min-w-[10rem]">
                        {name}
                    </p>
                </div>
            </div>
            <div className="flex flex-1 justify-between">
                <SingleIssueOption selected={selected} onSelect={setSelected} />
                <SingleIssueOption selected={selected} onSelect={setSelected} />
                <SingleIssueOption selected={selected} onSelect={setSelected} />
                <SingleIssueOption selected={selected} onSelect={setSelected} />
            </div>
        </div>
    )
}

