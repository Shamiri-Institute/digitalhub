"use client";

import { ChevronDownIcon } from "@radix-ui/react-icons";
import Link from "next/link";

import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { LinkOrDiv } from "#/components/ui/common";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

const sessionRatingOptions = [
  { sessionLabel: "Pre session", sessionType: "s0" },
  { sessionLabel: "Session 01", sessionType: "s1" },
  { sessionLabel: "Session 02", sessionType: "s2" },
  { sessionLabel: "Session 03", sessionType: "s3" },
  { sessionLabel: "Session 04", sessionType: "s4" },
];

export function SessionNavigationHeader({
  sessionName,
  schoolName,
  href,
  schoolVisibleId,
}: {
  sessionName: string;
  schoolName: string;
  href: string;
  schoolVisibleId: string;
}) {
  return (
    <div>
      <div className="mt-2 flex  justify-between ">
        <LinkOrDiv href={href}>
          <Icons.chevronLeft className="h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
        </LinkOrDiv>
        <div>
          <h3 className="text-xl font-bold text-brand">My School Report</h3>
          <h4 className="text-brand-light-gray text-center text-sm">
            {schoolName}
          </h4>
          <div className="justify-items-center pl-8 pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="ml-auto place-self-center whitespace-nowrap px-2 py-1.5 text-[0.8125rem] font-medium md:px-4 md:py-2 md:text-sm"
                >
                  {sessionName}
                  <ChevronDownIcon className="ml-1 h-4 w-4 md:ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sessionRatingOptions.map((session) => {
                  return (
                    <DropdownMenuItem
                      key={session.sessionType}
                      className="relative flex justify-between pr-10"
                      onSelect={() => {
                        if (href.includes("profile")) {
                          window.location.href = `${href}/school-report/session?type=${session.sessionType}&sid=${schoolVisibleId}`;
                        } else {
                          window.location.href = `${href}/session-report/${schoolVisibleId}?type=${session.sessionType}&sid=${schoolVisibleId}`;
                        }
                      }}
                    >
                      {session.sessionLabel}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Link
          href={`/profile/school-report?sid=${schoolVisibleId}`}
          className="invisible"
        >
          <Icons.xIcon className="h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
        </Link>
      </div>
    </div>
  );
}
