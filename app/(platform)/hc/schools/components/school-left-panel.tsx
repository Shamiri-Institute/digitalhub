"use client";

import CountWidget from "#/app/(platform)/hc/components/count-widget";
import SessionsOccurredWidget from "#/app/(platform)/hc/schools/components/sessions-occurred-widget";
import { SchoolsDataContext } from "#/app/(platform)/hc/schools/context/schools-data-context";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Separator } from "#/components/ui/separator";
import LocationIcon from "#/public/icons/location-pin-icon.svg";
import MailIcon from "#/public/icons/mail-icon.svg";
import PhoneIcon from "#/public/icons/telephone-icon.svg";
import { useGSAP } from "@gsap/react";
import { Prisma } from "@prisma/client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useRef, useState } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function SchoolLeftPanel({
  selectedSchool,
}: {
  selectedSchool: Prisma.SchoolGetPayload<{
    include: {
      interventionSessions: true;
      _count: {
        select: {
          interventionSessions: true;
          students: true;
          interventionGroups: {
            where: {
              archivedAt: null;
            };
          };
        };
      };
      hub: true;
    };
  }> | null;
}) {
  const context = useContext(SchoolsDataContext);
  const pathname = usePathname();
  const schoolVisibleId = pathname.split("/")[3];
  const _school = context.schools.findIndex((school) => {
    return school.visibleId === schoolVisibleId;
  });
  const [school, setSchool] = useState(context.schools[_school]);
  const panelRef: any = useRef(null);

  useGSAP(
    () => {
      if (panelRef !== null) {
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
    },
    { scope: panelRef },
  );

  const avatarContent =
    school?.schoolName
      .split(" ")
      .filter((i) => i.toLowerCase() !== "school")
      .map((i) => i[0]?.toUpperCase())
      .join("") ?? "N/A";

  return (
    <div
      ref={panelRef}
      className="h-screen w-1/4 space-y-6 overflow-y-scroll border-r border-solid border-shamiri-light-grey px-6 py-8"
    >
      <div className="flex items-start gap-x-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-shamiri-new-light-blue p-[18px] text-xl font-semibold text-shamiri-new-blue">
          {avatarContent}
        </div>
        <h2 className="text-[28px] font-semibold text-black">
          {school?.schoolName}
        </h2>
      </div>
      <Separator />
      <SessionsOccurredWidget
        sessions={selectedSchool?.interventionSessions ?? []}
      />
      <div className="flex justify-center">
        <CountWidget
          sessions={selectedSchool?._count.interventionSessions}
          fellows={selectedSchool?._count.interventionGroups}
          cases={selectedSchool?._count.students}
        />
      </div>
      <div>
        <Accordion
          type="multiple"
          defaultValue={["contact-information", "school-information"]}
          className="w-full"
        >
          <AccordionItem value="contact-information">
            <AccordionTrigger>
              <div className="flex w-full justify-between gap-2">
                <span>Contact details</span>
                <span className="cursor-pointer text-shamiri-new-blue">
                  Edit
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
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
                <div className="flex gap-2">
                  {school?.pointPersonPhone === null ||
                  school?.pointPersonPhone === "N/A" ? (
                    <span className="text-shamiri-text-grey">
                      Not available
                    </span>
                  ) : (
                    school?.pointPersonPhone.split("/").map((phone) => {
                      return (
                        <a href={`tel:${phone}`} key={phone} className="flex">
                          <div className="rounded-full border px-1.5 py-0.5 text-shamiri-new-blue">
                            {phone}
                          </div>
                        </a>
                      );
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
                    ? school?.schoolSubCounty + ","
                    : ""}{" "}
                  {school?.schoolCounty}
                </p>
                {school?.latitude !== null && school?.longitude !== null ? (
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
            <AccordionTrigger>
              <div className="flex w-full justify-between gap-2">
                <span>Information</span>
                <span className="cursor-pointer text-shamiri-new-blue">
                  Edit
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm font-medium leading-5">
              <div>
                <p className="text-shamiri-black">Type</p>
                <p className="text-shamiri-text-grey">{school?.schoolType}</p>
              </div>
              <div>
                <p className="text-shamiri-black">Hub</p>
                <p className="text-shamiri-text-grey">
                  {selectedSchool?.hub?.hubName}
                </p>
              </div>
              <div>
                <p className="text-shamiri-black">Point person</p>
                <p className="text-shamiri-text-grey">
                  {school?.pointPersonName}
                </p>
              </div>
              <div>
                <p className="text-shamiri-black">Point person phone number</p>
                <div className="flex gap-2">
                  {school?.pointPersonPhone === null ||
                  school?.pointPersonPhone === "N/A" ? (
                    <span className="text-shamiri-text-grey">
                      Not available
                    </span>
                  ) : (
                    school?.pointPersonPhone.split("/").map((phone) => {
                      return (
                        <a href={`tel:${phone}`} key={phone} className="flex">
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
                <p className="text-shamiri-black">Description</p>
                <p className="text-shamiri-text-grey">N/A</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
