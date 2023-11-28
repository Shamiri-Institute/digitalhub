'use client'
import { cn } from "#/lib/utils";
import { useState } from "react";

export function ReferralDetails() {
    const [referredFromSelected, setReferredFromSelected] = useState("")
    const [referredToSelected, setReferredToSelected] = useState("")

    const handleReferredFrom = (option: string) => {
        // TODO: API CALL 
        setReferredFromSelected(option)
    }

    const handleReferredTo = (option: string) => {
        // TODO: API CALL 
        setReferredToSelected(option)
    }

    return (
        <div className="flex gap-5">
            <div className="bg-shamiri-blue px-3 py-4 rounded-lg flex-1">
                <div className="bg-shamiri-light-blue py-2 rounded-md">
                    <p className="text-sm text-center">
                        Referred from
                    </p>
                </div>
                <div className="mt-4">
                    <ReferOption option="Fellow" onSelect={handleReferredFrom} selected={referredFromSelected} />
                    <ReferOption option="Self Referral" onSelect={handleReferredFrom} selected={referredFromSelected} />
                    <ReferOption option="Teacher" onSelect={handleReferredFrom} selected={referredFromSelected} />
                    <ReferOption option="Supervisor" onSelect={handleReferredFrom} selected={referredFromSelected} />
                    <ReferOption option="Another Student" onSelect={handleReferredFrom} selected={referredFromSelected} />
                </div>
            </div>
            <div className="bg-shamiri-blue px-3 py-4 rounded-lg flex-1">
                <div className="bg-muted-pink py-2 rounded-sm ">
                    <p className="text-sm text-center">
                        Refer to
                    </p>
                </div>
                <div className="mt-4">
                    <ReferOption option="Fellow" to onSelect={handleReferredTo} selected={referredToSelected} />
                    <ReferOption option="Self Referral" to onSelect={handleReferredTo} selected={referredToSelected} />
                    <ReferOption option="Teacher" to onSelect={handleReferredTo} selected={referredToSelected} />
                    <ReferOption option="Supervisor" to onSelect={handleReferredTo} selected={referredToSelected} />
                    <ReferOption option="Another Student" to onSelect={handleReferredTo} selected={referredToSelected} />
                </div>
            </div>
        </div>
    );
}

function ReferOption({ option, to = false, onSelect, selected }: { option: string; to?: Boolean; selected: string; onSelect: (option: string) => void }) {

    return (
        <div className="flex my-3">
            <button className={cn("h-6 w-6 border-2 rounded-sm border-shamiri-light-blue",
                to && "border-muted-pink",
                selected === option && to && "bg-muted-pink",
                !to && selected === option && "bg-shamiri-light-blue"
            )}
                onClick={() => onSelect(option)}
            />
            <p className="text-sm ml-4 text-white font-medium">
                {option}
            </p>
        </div>
    )
}