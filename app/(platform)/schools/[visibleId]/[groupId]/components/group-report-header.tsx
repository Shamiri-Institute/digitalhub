"use client";
import { ChevronDownIcon } from "@radix-ui/react-icons";

import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { LinkOrDiv } from "#/components/ui/common";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

export const GroupReportHeader = ({
  schoolName,
  sessionName,
  href,
  schoolVisibleId,
  groupName,
}: {
  schoolName: string;
  sessionName: string;
  href: string;
  schoolVisibleId: string;
  groupName: string;
}) => {
  const sessionRatingOptions = [
    { sessionLabel: "All Sessions", sessionType: "all" },
    // todo: uncomment this for other sessions - rn we only show all sessions rating cc @WendyMbone
    // { sessionLabel: "Pre session", sessionType: "s0" },
    // { sessionLabel: "Session 01", sessionType: "s1" },
    // { sessionLabel: "Session 02", sessionType: "s2" },
    // { sessionLabel: "Session 03", sessionType: "s3" },
    // { sessionLabel: "Session 04", sessionType: "s4" },
  ];

  return (
    <div>
      <div className="mt-2 flex">
        <LinkOrDiv href={href}>
          <Icons.chevronLeft className="h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
        </LinkOrDiv>
        <div className="flex-1 justify-center ">
          <h3 className="text-center text-xl font-bold text-brand">
            {groupName} - Group Report
          </h3>
          <h4 className="text-brand-light-gray text-center text-sm">
            {schoolName}
          </h4>
          <h4 className="text-brand-light-gray text-center text-sm">
            {schoolVisibleId}
          </h4>

          <div className=" mt-2 flex justify-center">
            <div>
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
                          window.location.href = `${href}/${groupName}?type=${session.sessionType}`;
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
        </div>
      </div>
    </div>
  );
};
