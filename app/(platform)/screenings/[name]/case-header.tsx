"use client";
import { FlagStudentDialog } from "#/app/(platform)/screenings/[name]/components/flag-reason-dialog";
import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";
import Link from "next/link";
import { useState } from "react";

type Colors = {
  [key: string]: string;
};

const colors: Colors = {
  active: "bg-muted-green",
  "follow-up": "bg-muted-yellow",
  referred: "bg-muted-pink",
  terminated: "bg-muted-sky",
};

const sampleReferredCasses = [
  { id: 1, status: "active" },
  { id: 3, status: "follow-up" },
  { id: 4, status: "terminated" },
  { id: 2, status: "referred" },
];

export default function CaseHeader({ name }: { name: string }) {
  const [selected, setSelected] = useState<string>("");
  const [color, setColor] = useState<string | undefined>("");
  const [flagged, setFlagged] = useState<boolean>(false);

  const handleOption = (status: string) => {
    setSelected(status);
    setColor(colors[status]);
  };

  const handleFlagged = () => {
    // todo: prevent unflagging if flagged
    if (flagged) {
      return;
    }
    setFlagged(!flagged);
  };

  return (
    <>
      <div className="my-4 flex justify-between">
        <Link href="/screenings">
          <Icons.chevronLeft className="h-6 w-6 text-brand" />
        </Link>
        {/* TODO:  */}
        <FlagStudentDialog>
          <button onClick={handleFlagged}>
            <Icons.flagcase
              className={cn(
                "h-6 w-6 text-muted-foreground",
                flagged && "text-shamiri-red",
              )}
            />
          </button>
        </FlagStudentDialog>
      </div>

      <div className="flex flex-1">
        <div
          className={cn(
            "flex h-24 w-24 items-center justify-center rounded-full bg-muted-green",
            color && color,
          )}
        >
          <div className="h-20 w-20 rounded-full bg-muted-foreground" />
        </div>
        <div className="ml-6 flex flex-1 flex-col justify-center ">
          <div className="flex flex-col">
            <p className="text-base font-bold text-brand">{name}</p>
            <p className="text-sm font-medium text-muted-foreground">
              Shamiri ID
            </p>
          </div>
          <div className="mt-1 flex justify-between">
            {sampleReferredCasses.map((stud) => (
              <button
                key={stud.id}
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-md bg-[#bbb]",
                  // colors[stud.status]
                  selected === stud.status && colors[stud.status],
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
