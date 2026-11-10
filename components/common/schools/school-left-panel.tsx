"use client";

import { format } from "date-fns";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import Image from "next/image";
import Link from "next/link";
import CountWidget from "#/app/(platform)/hc/components/count-widget";
import type { SchoolPanelData } from "#/components/common/schools/school-view-layout";
import SessionsOccurredWidget from "#/components/common/schools/sessions-occurred-widget";
import { Icons } from "#/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn, getSchoolInitials } from "#/lib/utils";
import LocationIcon from "#/public/icons/location-pin-icon.svg";
import MailIcon from "#/public/icons/mail-icon.svg";
import PhoneIcon from "#/public/icons/telephone-icon.svg";
import { DISPLAY_DATE } from "#/lib/date-utils";

export default function SchoolLeftPanel({
  open = false,
  school,
}: {
  open?: boolean;
  school: SchoolPanelData;
}) {
  function renderPhoneNumbers(phone: string) {
    try {
      const phoneNumber = parsePhoneNumberWithError(phone, "KE");
      return (
        <a href={phoneNumber.getURI()} key={phone} className="flex">
          <div className="rounded-full border px-1.5 py-0.5 text-primary">
            {phoneNumber.formatNational()}
          </div>
        </a>
      );
    } catch (error) {
      console.error(error);
      return;
    }
  }

  return (
    <div className="h-auto w-full space-y-6 px-0 py-0 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-r lg:border-solid lg:border-border lg:px-6 lg:py-4">
      {/* The visible name sits inside the accordion's button, where a heading cannot go. */}
      <h1 className="sr-only">{school.schoolName}</h1>
      <Accordion {...(open ? { value: ["default"] } : { defaultValue: [] })}>
        <AccordionItem value="default">
          <AccordionTrigger
            iconClass={open ? "hidden" : ""}
            className={cn("py-0 lg:py-6", !open ? "flex-row-reverse justify-between" : "")}
          >
            <div className="flex items-center gap-x-4 2xl:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-info-bg text-lg font-semibold text-primary lg:h-16 lg:w-16 lg:p-[18px] lg:text-xl">
                {getSchoolInitials(school.schoolName)}
              </div>
              <span className="text-xl font-semibold text-foreground lg:text-left lg:text-[28px]">
                {school.schoolName}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-5 pt-6">
            <div className="min-h-[15vh] flex items-center justify-center">
              <SessionsOccurredWidget
                types={school.hub?.sessions}
                sessions={school.interventionSessions}
              />
            </div>
            <div className="flex justify-center px-4">
              <CountWidget
                stats={[
                  {
                    title: "Sessions",
                    count: school.interventionSessionsCount,
                  },
                  {
                    title: "Groups",
                    count: school.interventionGroupsCount,
                  },
                  {
                    title: "Students",
                    count: school.studentsCount,
                  },
                ]}
              />
            </div>
            <div>
              <Accordion multiple className="w-full">
                <AccordionItem value="contact-information">
                  <AccordionTrigger className="border-b">
                    <div className="flex w-full justify-between gap-2 text-base">
                      <span>Contact details</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-4">
                    <div className="text-sm font-medium leading-5">
                      <div className="flex items-center gap-2">
                        <Image
                          unoptimized
                          priority
                          src={PhoneIcon}
                          alt="Telephone Icon"
                          width={16}
                          height={16}
                        />
                        <p className="text-foreground">Phone Number</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {school.pointPersonPhone === null || school.pointPersonPhone === "N/A" ? (
                          <span className="text-muted-foreground">Not available</span>
                        ) : (
                          school.pointPersonPhone.split("/").map((phone) => {
                            return renderPhoneNumbers(phone);
                          })
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-medium leading-5">
                      <div className="flex items-center gap-2">
                        <Image
                          unoptimized
                          priority
                          src={MailIcon}
                          alt="Mail Icon"
                          width={16}
                          height={16}
                        />
                        <p className="text-sm font-medium leading-5 text-foreground">Email</p>
                      </div>
                      {school.schoolEmail ? (
                        <Link
                          href={`mailto:${school.schoolEmail}`}
                          className="text-muted-foreground"
                        >
                          {school.schoolEmail}
                        </Link>
                      ) : (
                        <p className="text-muted-foreground">N/A</p>
                      )}
                    </div>
                    <div className="text-sm font-medium leading-5">
                      <div className="flex items-center gap-2">
                        <Image
                          unoptimized
                          priority
                          src={LocationIcon}
                          alt="Mail Icon"
                          width={16}
                          height={16}
                        />
                        <p className="text-foreground">Location</p>
                      </div>
                      <p className="text-muted-foreground">
                        {school.schoolSubCounty !== null ? `${school.schoolSubCounty.trim()},` : ""}{" "}
                        {school.schoolCounty}
                      </p>
                      {school.latitude !== null && school.longitude !== null ? (
                        <a
                          href={`https://maps.google.com?q=${school.latitude},${school.longitude}`}
                          className="text-primary"
                        >
                          Get directions
                        </a>
                      ) : null}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="school-information">
                  <AccordionTrigger className="border-b">
                    <div className="flex w-full justify-between gap-2 text-base">
                      <span>Information</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-4 text-sm font-medium leading-5">
                    <div>
                      <p className="text-foreground">Type</p>
                      <p className="text-muted-foreground">{school.schoolType}</p>
                    </div>
                    <div>
                      <p className="text-foreground">Hub</p>
                      <p className="text-muted-foreground">{school.hub?.hubName}</p>
                    </div>
                    <div>
                      <p className="text-foreground">Principal</p>
                      <p className="text-muted-foreground">{school.principalName}</p>
                    </div>
                    <div>
                      <p className="text-foreground">Principal phone number</p>
                      <div className="flex gap-2">
                        {school.principalPhone === null || school.principalPhone === "N/A" ? (
                          <span className="text-muted-foreground">Not available</span>
                        ) : (
                          school.principalPhone.split("/").map((phone) => {
                            return (
                              <a href={`tel:${phone}`} key={phone} className="flex">
                                <div className="rounded-full border px-1.5 py-0.5 text-primary">
                                  {phone}
                                </div>
                              </a>
                            );
                          })
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-foreground">Point teacher</p>
                      <p className="text-muted-foreground">{school.pointPersonName}</p>
                    </div>
                    <div>
                      <p className="text-foreground">Point teacher phone number</p>
                      <div className="flex flex-wrap gap-2">
                        {school.pointPersonPhone === null || school.pointPersonPhone === "N/A" ? (
                          <span className="text-muted-foreground">Not available</span>
                        ) : (
                          school.pointPersonPhone.split("/").map((phone) => {
                            return renderPhoneNumbers(phone);
                          })
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="dropout-history">
                  <AccordionTrigger className="border-b">
                    <div className="flex w-full justify-between gap-2 text-base">
                      <span>Dropout History</span>
                    </div>
                  </AccordionTrigger>
                  {school.schoolDropoutHistory.length > 0 ? (
                    <AccordionContent className="pt-4 text-sm font-medium leading-5">
                      {school.schoolDropoutHistory.map((history) => {
                        return (
                          <div key={history.id} className="flex justify-between py-2.5">
                            <div>
                              {history.droppedOut ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="flex items-start gap-2">
                                      <Icons.flagTriangleLeft className="h-5 w-5 text-destructive" />
                                      <div className="text-left">
                                        <span>Dropped out</span>
                                        <span className="flex text-sm text-muted-foreground">
                                          {history.user.name}
                                        </span>
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    align="start"
                                    className="border bg-white text-foreground drop-shadow-sm"
                                  >
                                    {history.dropoutReason && (
                                      <p className="text-sm">
                                        <span className="underline">Reason</span>:
                                        <span className="pl-1">{history.dropoutReason}</span>
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <Icons.flagTriangleRight className="h-5 w-5 text-success" />
                                  <div className="flex flex-col">
                                    <p>Dropout undone</p>
                                    <span className="flex items-baseline text-sm text-muted-foreground">
                                      {history.user.name}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <span className="text-muted-foreground">
                              {format(history.createdAt, DISPLAY_DATE)}
                            </span>
                          </div>
                        );
                      })}
                    </AccordionContent>
                  ) : (
                    <AccordionContent>
                      <span className="text-muted-foreground">No drop out records available</span>
                    </AccordionContent>
                  )}
                </AccordionItem>
              </Accordion>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
