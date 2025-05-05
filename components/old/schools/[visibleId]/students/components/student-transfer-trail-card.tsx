import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { Prisma } from "@prisma/client";

export function StudentTransferTrailCard({
  student,
  studentTrail,
}: {
  studentTrail: Prisma.StudentGroupTransferTrailGetPayload<{
    include: {
      student: {
        include: {
          fellow: true;
        };
      };
    };
  }>[];
  student: Prisma.StudentGetPayload<{
    include: {
      fellow: true;
    };
  }>;
}) {
  return (
    <Card
      className={"my-4 flex flex-col gap-5 self-start bg-gray-300 p-5 pr-3.5"}
    >
      <div className="flex justify-between">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold">{student.studentName || "N/A"}</h2>
          <p className="text-sm text-gray-600">
            Shamiri ID: {student.visibleId}
          </p>
          <p className="text-sm text-gray-600">
            Current Group: {student.assignedGroupId}
          </p>
          <p className="text-sm text-gray-600">
            Current Fellow: {student.fellow?.fellowName || "N/A"}
          </p>
        </div>
      </div>
      <Separator />
      <div className="relative items-center justify-between">
        <Accordion type="single" collapsible>
          <AccordionItem value={`id-${student.visibleId}`}>
            <AccordionTrigger
              className={"items-right border-b border-border/50 pt-0"}
            >
              <span className="text-brand">View group transfer history</span>
            </AccordionTrigger>

            <AccordionContent>
              <ol className="m-5 list-decimal text-brand">
                {studentTrail.map((trail) => {
                  if (trail.studentId === student.id) {
                    return (
                      <SingleHistory
                        key={trail.id}
                        referredFrom={trail?.fromGroupId!}
                        referredTo={trail.currentGroupId}
                        date={trail.createdAt}
                      />
                    );
                  }
                })}
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Card>
  );
}

export function SingleHistory({
  date = new Date(),
  referredFrom = "",
  referredTo = "",
}: {
  date: Date;
  referredFrom: string;
  referredTo: string;
}) {
  return (
    <li>
      <p className="mb-2 ml-2 text-xs text-brand">
        {`${new Date(
          date,
        ).toLocaleDateString()} - Referred from ${referredFrom} to ${referredTo}.`}
      </p>
    </li>
  );
}
