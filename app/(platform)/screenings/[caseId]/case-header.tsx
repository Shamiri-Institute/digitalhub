"use client";
import { FlagStudentDialog } from "#/app/(platform)/screenings/[caseId]/components/flag-reason-dialog";
import { CurrentCase } from "#/app/(platform)/screenings/screen";
import { updateClinicalCaseStatus } from "#/app/actions";
import { Icons } from "#/components/icons";
import { cn, getInitials } from "#/lib/utils";
import { caseStatusOptions } from "@prisma/client";
import Link from "next/link";
import { useState } from "react";

type Colors = {
  [key: string]: string;
};

const colors: Colors = {
  Active: "bg-muted-green",
  FollowUp: "bg-muted-yellow",
  Referred: "bg-muted-pink",
  Terminated: "bg-muted-sky",
};

const casesColorOptions: {
  id: number;
  status: caseStatusOptions;
}[] = [
  { id: 1, status: "Active" },
  { id: 2, status: "FollowUp" },
  { id: 3, status: "Terminated" },
];

export default function CaseHeader({
  currentcase,
}: {
  currentcase: CurrentCase;
}) {
  const [selected, setSelected] = useState<string>(currentcase.caseStatus);
  const [color, setColor] = useState<string | undefined>("");
  const [flagged, setFlagged] = useState<boolean>(currentcase.flagged);

  const handleOption = async (status: caseStatusOptions) => {
    try {
      setSelected(status);
      setColor(colors[status]);
      await updateClinicalCaseStatus(currentcase.id, status);
    } catch (error) {
      console.log(error);
    }
  };

  const handleFlagged = () => {
    if (currentcase.flagged) {
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
        {currentcase.referralStatus ? (
          <span
            className={cn(
              "ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800",
              currentcase.referralStatus == "Approved" &&
                "bg-green-100 text-green-800",
              currentcase.referralStatus == "Declined" &&
                "bg-red-100 text-red-800",
            )}
          >
            {currentcase.referralStatus}
          </span>
        ) : null}
        <FlagStudentDialog
          caseId={currentcase.id}
          reason={currentcase.caseReport}
        >
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
            colors[selected],
          )}
        >
          <div className="flex h-20 w-20 justify-center rounded-full bg-muted-foreground">
            <h3 className="self-center text-center text-4xl font-semibold text-brand">
              {getInitials(currentcase?.student?.studentName ?? "")}
            </h3>
          </div>
        </div>
        <div className="ml-6 flex flex-1 flex-col justify-center ">
          <div className="flex flex-col">
            <p className="text-base font-bold text-brand">
              {currentcase.student.studentName}
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              Shamiri ID: {currentcase.student.visibleId}
            </p>
          </div>
          <div className="mt-1 flex justify-between">
            {casesColorOptions.map((stud) => (
              <button
                key={stud.id}
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-md bg-[#bbb]",
                  stud.status == selected && colors[selected],
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
