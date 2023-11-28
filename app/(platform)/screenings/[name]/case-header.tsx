"use client"
import { useState } from "react";
import { cn } from "#/lib/utils";
import { Icons } from "#/components/icons";
import { sampleReferredCasses, colors } from "./page";
import Link from "next/link";
import { FlagStudentDialog } from "#/app/(platform)/screenings/[name]/components/flag-reason-dialog";

export default function CaseHeader({ name }: { name: string }) {
    const [selected, setSelected] = useState<string>("")
    const [color, setColor] = useState<string | undefined>("")
    const [flagged, setFlagged] = useState<boolean>(false)

    const handleOption = (status: string) => {
        setSelected(status)
        setColor(colors[status])
    }

    const handleFlagged = () => {
        // todo: prevent unflagging if flagged
        if (flagged) {
            return
        }
        setFlagged(!flagged)
    }


    return (
        <>
            <div className="flex justify-between my-4">
                <Link href="/screenings">
                    <Icons.chevronLeft className="w-6 h-6 text-brand" />
                </Link>
                {/* TODO:  */}
                <FlagStudentDialog>
                    <button onClick={handleFlagged}>
                        <Icons.flagcase className={cn("w-6 h-6 text-muted-foreground",
                            flagged && "text-shamiri-red")}
                        />
                    </button>
                </FlagStudentDialog>
            </div>

            <div className="flex flex-1">
                <div className={cn("flex rounded-full h-24 w-24 justify-center items-center bg-muted-green",
                    color && color
                )}>
                    <div className="rounded-full h-20 w-20 bg-muted-foreground" />
                </div>
                <div className="flex flex-col flex-1 ml-6 justify-center ">
                    <div className="flex flex-col">
                        <p className="text-base font-bold text-brand">{name}</p>
                        <p className="text-sm font-medium text-muted-foreground">Shamiri ID</p>
                    </div>
                    <div className="flex mt-1 justify-between">
                        {sampleReferredCasses.map((stud) => (
                            <button
                                key={stud.id}
                                className={cn(
                                    "flex rounded-md h-7 w-12 justify-center items-center bg-[#bbb]",
                                    // colors[stud.status]
                                    selected === stud.status && colors[stud.status]
                                )}
                                onClick={() => handleOption(stud.status)}
                            >
                                <p className="text-sm font-medium text-white ">
                                    {stud.status.charAt(0).toUpperCase()}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
