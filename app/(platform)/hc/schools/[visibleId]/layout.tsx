import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import Image from "next/image";
import Link from "next/link";
import LocationIcon from "../../../../../public/icons/location-pin-icon.svg";
import MailIcon from "../../../../../public/icons/mail-icon.svg";
import PhoneIcon from "../../../../../public/icons/telephone-icon.svg";
import SchoolsNav from "../components/schools-nav";

export default async function SchoolViewLayout({
  children,
  params: { visibleId },
}: {
  children: React.ReactNode;
  params: { visibleId: string };
}) {
  const school = await db.school.findFirst({
    where: {
      visibleId,
    },
    include: {
      _count: {
        select: {
          interventionSessions: true,
          students: true,
          interventionGroups: {
            where: {
              archivedAt: null,
            },
          },
        },
      },
      hub: true,
    },
  });

  const avatarContent =
    school?.schoolName
      .split(" ")
      .filter((i) => i.toLowerCase() !== "school")
      .map((i) => i[0]?.toUpperCase())
      .join("") ?? "N/A";

  return (
    <div className="flex">
      <div className="space-y-6 border-r border-solid border-shamiri-light-grey px-6 py-8">
        <div className="flex items-center gap-x-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-shamiri-new-light-blue p-[18px] text-xl font-semibold text-shamiri-new-blue">
            {avatarContent}
          </div>
          <h2 className="text-[28px] font-semibold text-black">
            {school?.schoolName}
          </h2>
        </div>
        <Separator />
        <div className="grid grid-cols-3 justify-items-stretch divide-x divide-shamiri-light-grey rounded-lg border border-shamiri-light-grey bg-background-secondary text-center">
          <div>
            <p className="text-sm font-medium leading-5 text-shamiri-text-grey">
              Sessions
            </p>
            <p>{school?._count.interventionSessions}</p>
          </div>
          <div>
            <p className="text-sm font-medium leading-5 text-shamiri-text-grey">
              Fellows
            </p>
            <p>{school?._count.interventionGroups}</p>
          </div>
          <div>
            <p className="text-sm font-medium leading-5 text-shamiri-text-grey">
              Students
            </p>
            <p>{school?._count.students}</p>
          </div>
        </div>
        <div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="contact-information">
              <AccordionTrigger>Contact Details</AccordionTrigger>
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
                  <p className="text-shamiri-text-grey">N/A</p>
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
                    N/A: please add link to google maps since we have lat/long
                    values
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="school-information">
              <AccordionTrigger>Information</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm font-medium leading-5">
                <div>
                  <p className="text-shamiri-black">Type</p>
                  <p className="text-shamiri-text-grey">{school?.schoolType}</p>
                </div>
                <div>
                  <p className="text-shamiri-black">Hub</p>
                  <p className="text-shamiri-text-grey">
                    {school?.hub?.hubName}
                  </p>
                </div>
                <div>
                  <p className="text-shamiri-black">Point person</p>
                  <p className="text-shamiri-text-grey">
                    {school?.pointPersonName}
                  </p>
                </div>
                <div>
                  <p className="text-shamiri-black">
                    Point person phone number
                  </p>
                  {school?.pointPersonPhone ? (
                    <Link
                      href={`tel:${school?.pointPersonPhone}`}
                      className="text-shamiri-text-grey"
                    >
                      {school?.pointPersonPhone}
                    </Link>
                  ) : (
                    <p className="text-shamiri-text-grey">N/A</p>
                  )}
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
      <div className="w-full space-y-5 pb-6 pl-6 pr-8 pt-5">
        <SchoolsNav visibleId={visibleId} />
        <Separator />
        {children}
      </div>
    </div>
  );
}
