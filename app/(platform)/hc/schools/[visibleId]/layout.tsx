import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import Link from "next/link";
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
    },
  });

  const avatarContent = school?.schoolName
    .split(" ")
    .filter((i) => i.toLowerCase() !== "school")
    .map((i) => i[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex">
      <div className="space-y-6 border-r-shamiri-light-grey px-6 py-8">
        <div className="flex items-center gap-x-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-shamiri-new-light-blue p-[18px] text-xl font-semibold text-shamiri-new-blue">
            {avatarContent}
          </div>
          <h2 className="text-[28px] font-semibold text-black">
            {school?.schoolName}
          </h2>
        </div>
        <Separator />
        <div>Session pills go here</div>
        <div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="contact-information">
              <AccordionTrigger>Contact Details</AccordionTrigger>
              <AccordionContent>
                <div>
                  <p>Phone Number</p>
                  <p>N/A</p>
                </div>
                <div>
                  <p>Email</p>
                  <Link href={`mailto:${school?.schoolEmail}`}>
                    {school?.schoolEmail}
                  </Link>
                </div>
                <div>
                  <p>Location</p>
                  <p>
                    N/A: please add link to google maps since we have lat/long
                    values
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="school-information">
              <AccordionTrigger>Information</AccordionTrigger>
              <AccordionContent>
                <div>
                  <p>Type</p>
                  <p>Hub</p>
                </div>
                <div>
                  <p>Point person</p>
                </div>
                <div>
                  <p>Point person phone number</p>
                </div>
                <div>
                  <p>Description</p>
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
