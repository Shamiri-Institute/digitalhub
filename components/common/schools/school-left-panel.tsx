"use client";

import CountWidget from "#/app/(platform)/hc/components/count-widget";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
import SessionsOccurredWidget from "#/components/common/schools/sessions-occurred-widget";
import { Icons } from "#/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";
import { cn, getSchoolInitials } from "#/lib/utils";
import LocationIcon from "#/public/icons/location-pin-icon.svg";
import MailIcon from "#/public/icons/mail-icon.svg";
import PhoneIcon from "#/public/icons/telephone-icon.svg";
import { useGSAP } from "@gsap/react";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { parsePhoneNumber } from "libphonenumber-js";
import Image from "next/image";
import Link from "next/link";
import { useContext, useEffect, useRef, useState } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkScreenSize(); // Initial check
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, [breakpoint]);

  return isMobile;
}

export default function SchoolLeftPanel({
  selectedSchool,
  open = false,
}: {
  selectedSchool: Prisma.SchoolGetPayload<{
    include: {
      interventionSessions: {
        include: {
          session: true;
        };
      };
      schoolDropoutHistory: {
        include: {
          user: true;
        };
      };
      hub: {
        include: {
          sessions: true;
        };
      };
      _count: {
        select: {
          interventionSessions: true;
          students: {
            where: {
              isClinicalCase: true;
            };
          };
          interventionGroups: {
            where: {
              archivedAt: null;
            };
          };
        };
      };
    };
  }> | null;
  open?: boolean;
}) {
  const schoolContext = useContext(SchoolInfoContext);
  const { school } = schoolContext;
  const panelRef: any = useRef(null);
  const isMobile = useIsMobile();
  console.log(isMobile);

  useGSAP(
    () => {
      let mm = gsap.matchMedia();

      mm.add("(min-width: 768px)", () => {
        if (panelRef?.current) {
          gsap.timeline({
            scrollTrigger: {
              trigger: panelRef.current,
              start: () => "top top",
              end: () => "+=100%",
              scrub: true,
              pin: true,
              pinSpacing: false,
              // markers: true,
            },
          });
        }
      });

      return () => mm.revert();
    },
    { scope: panelRef },
  );

  function renderPhoneNumbers(phone: string) {
    try {
      const phoneNumber = parsePhoneNumber(phone, "KE");
      return (
        <a href={phoneNumber.getURI()} key={phone} className="flex">
          <div className="rounded-full border px-1.5 py-0.5 text-shamiri-new-blue">
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
    <div
      ref={panelRef}
      className="h-auto w-full space-y-6 px-0 py-0 lg:h-screen lg:overflow-y-scroll lg:border-r lg:border-solid lg:border-shamiri-light-grey lg:px-6 lg:py-4"
    >
      <Accordion
        type="single"
        defaultValue={open ? "default" : ""}
        collapsible={!open}
      >
        <AccordionItem value="default">
          <AccordionTrigger
            iconClass={open ? "hidden" : ""}
            className={cn(
              "py-0 lg:py-6",
              !open ? "flex-row-reverse justify-between" : "",
            )}
          >
            <div className="flex items-center gap-x-4 2xl:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-shamiri-new-light-blue text-lg font-semibold text-shamiri-new-blue lg:h-16 lg:w-16 lg:p-[18px] lg:text-xl">
                {getSchoolInitials(school?.schoolName ?? "")}
              </div>
              <h2 className="text-xl font-semibold text-black lg:text-[28px]">
                {school?.schoolName}
              </h2>
            </div>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-5 pt-6">
            <SessionsOccurredWidget
              types={selectedSchool?.hub?.sessions}
              sessions={selectedSchool?.interventionSessions ?? []}
            />
            <div className="flex justify-center px-4">
              <CountWidget
                stats={[
                  {
                    title: "Sessions",
                    count: selectedSchool?._count.interventionSessions || 0,
                  },
                  {
                    title: "Groups",
                    count: selectedSchool?._count.interventionGroups || 0,
                  },
                  {
                    title: "Students",
                    count: selectedSchool?._count.students || 0,
                  },
                ]}
              />
            </div>
            <div>
              <Accordion type="multiple" defaultValue={[]} className="w-full">
                <AccordionItem value="contact-information">
                  <AccordionTrigger className="border-b">
                    <div className="flex w-full justify-between gap-2 text-base">
                      <span>Contact details</span>
                      {!school?.droppedOut && (
                        <span
                          className="accordion-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            schoolContext.setEditDialog(true);
                          }}
                        >
                          Edit
                        </span>
                      )}
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
                        {/*TODO: inter */}
                        <p className="text-shamiri-black">Phone Number</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {school?.pointPersonPhone === null ||
                        school?.pointPersonPhone === "N/A" ? (
                          <span className="text-shamiri-text-grey">
                            Not available
                          </span>
                        ) : (
                          school?.pointPersonPhone.split("/").map((phone) => {
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
                        <p className="text-sm font-medium leading-5 text-shamiri-black">
                          Email
                        </p>
                      </div>
                      {school?.schoolEmail ? (
                        <Link
                          href={`mailto:${school?.schoolEmail}`}
                          className="text-shamiri-text-grey"
                        >
                          {school?.schoolEmail}
                        </Link>
                      ) : (
                        <p className="text-shamiri-text-grey">N/A</p>
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
                        <p className="text-shamiri-black">Location</p>
                      </div>
                      <p className="text-shamiri-text-grey">
                        {school?.schoolSubCounty !== null
                          ? school?.schoolSubCounty?.trim() + ","
                          : ""}{" "}
                        {school?.schoolCounty}
                      </p>
                      {school?.latitude !== null &&
                      school?.longitude !== null ? (
                        <a
                          href={
                            "https://maps.google.com?q=" +
                            school?.latitude +
                            "," +
                            school?.longitude
                          }
                          className="text-shamiri-new-blue"
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
                      {!school?.droppedOut && (
                        <span
                          className="accordion-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            schoolContext.setEditDialog(true);
                          }}
                        >
                          Edit
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-4 text-sm font-medium leading-5">
                    <div>
                      <p className="text-shamiri-black">Type</p>
                      <p className="text-shamiri-text-grey">
                        {school?.schoolType}
                      </p>
                    </div>
                    <div>
                      <p className="text-shamiri-black">Hub</p>
                      <p className="text-shamiri-text-grey">
                        {selectedSchool?.hub?.hubName}
                      </p>
                    </div>
                    <div>
                      <p className="text-shamiri-black">Principal</p>
                      <p className="text-shamiri-text-grey">
                        {school?.principalName}
                      </p>
                    </div>
                    <div>
                      <p className="text-shamiri-black">
                        Principal phone number
                      </p>
                      <div className="flex gap-2">
                        {school?.principalPhone === null ||
                        school?.principalPhone === undefined ||
                        school?.principalPhone === "N/A" ? (
                          <span className="text-shamiri-text-grey">
                            Not available
                          </span>
                        ) : (
                          school?.principalPhone.split("/").map((phone) => {
                            return (
                              <a
                                href={`tel:${phone}`}
                                key={phone}
                                className="flex"
                              >
                                <div className="rounded-full border px-1.5 py-0.5 text-shamiri-new-blue">
                                  {phone}
                                </div>
                              </a>
                            );
                          })
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-shamiri-black">Point teacher</p>
                      <p className="text-shamiri-text-grey">
                        {school?.pointPersonName}
                      </p>
                    </div>
                    <div>
                      <p className="text-shamiri-black">
                        Point teacher phone number
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {school?.pointPersonPhone === null ||
                        school?.pointPersonPhone === "N/A" ? (
                          <span className="text-shamiri-text-grey">
                            Not available
                          </span>
                        ) : (
                          school?.pointPersonPhone.split("/").map((phone) => {
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
                      {selectedSchool?.droppedOut ? (
                        <span
                          className="accordion-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            schoolContext.setUndoDropOutDialog(true);
                          }}
                        >
                          Undo dropout
                        </span>
                      ) : (
                        <span
                          className="accordion-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            schoolContext.setSchoolDropOutDialog(true);
                          }}
                        >
                          Dropout
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  {selectedSchool?.schoolDropoutHistory &&
                  selectedSchool?.schoolDropoutHistory.length > 0 ? (
                    <AccordionContent className="pt-4 text-sm font-medium leading-5">
                      {selectedSchool?.schoolDropoutHistory.map((history) => {
                        return (
                          <div
                            key={history.id}
                            className="flex justify-between py-2.5"
                          >
                            <div>
                              {history.droppedOut ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="flex items-start gap-2">
                                      <Icons.flagTriangleLeft className="h-5 w-5 text-shamiri-red" />
                                      <div className="text-left">
                                        <span>Dropped out</span>
                                        <span className="flex text-sm text-gray-400">
                                          {history.user.name}
                                        </span>
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    align="start"
                                    className="border bg-white text-shamiri-black drop-shadow"
                                  >
                                    {history.dropoutReason && (
                                      <p className="text-sm">
                                        <span className="underline">
                                          Reason
                                        </span>
                                        :
                                        <span className="pl-1">
                                          {history.dropoutReason}
                                        </span>
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <Icons.flagTriangleRight className="h-5 w-5 text-shamiri-green" />
                                  <div className="flex flex-col">
                                    <p>Dropout undone</p>
                                    <span className="flex items-baseline text-sm text-gray-400">
                                      {history.user.name}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <span className="text-gray-400">
                              {format(history.createdAt, "dd-MM-yyyy")}
                            </span>
                          </div>
                        );
                      })}
                    </AccordionContent>
                  ) : (
                    <AccordionContent>
                      <span className="text-gray-400">
                        No drop out records available
                      </span>
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
