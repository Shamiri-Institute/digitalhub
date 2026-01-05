"use client";

import type { Prisma } from "@prisma/client";
import { Icons } from "#/components/icons";
import { cn, sessionDisplayName } from "#/lib/utils";

export default function SessionsOccurredWidget({
  sessions,
  types,
}: {
  sessions: Prisma.InterventionSessionGetPayload<{
    include: {
      session: true;
    };
  }>[];
  types?: Prisma.SessionNameGetPayload<{}>[];
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {types
        ?.filter(
          (sessionType) =>
            sessionType.sessionType === "INTERVENTION" ||
            sessionType.sessionType === "DATA_COLLECTION",
        )
        .map((sessionType) => {
          const occurredStatus = sessions.find((session) => {
            return session.session?.sessionName === sessionType.sessionName;
          })?.occurred;
          const cancelledStatus =
            sessions.find((session) => {
              return session.session?.sessionName === sessionType.sessionName;
            })?.status === "Cancelled";
          const rescheduledStatus =
            sessions.find((session) => {
              return session.session?.sessionName === sessionType.sessionName;
            })?.status === "Rescheduled";
          return (
            <div
              key={sessionType.sessionName}
              className={cn(
                "select-none rounded-lg border px-1.5 py-0.5",
                {
                  "border-green-border": occurredStatus,
                  "border-blue-border": !occurredStatus,
                  "border-red-border": cancelledStatus,
                  "border-shamiri-text-dark-grey/30": rescheduledStatus,
                },
                {
                  "bg-green-bg": occurredStatus,
                  "bg-blue-bg": !occurredStatus,
                  "bg-red-bg": cancelledStatus,
                  "bg-shamiri-light-grey/60": rescheduledStatus,
                },
              )}
            >
              <div
                className={cn("flex gap-1 text-[0.825rem] font-semibold", {
                  "text-green-base": occurredStatus,
                  "text-blue-base": !occurredStatus,
                  "text-red-base": cancelledStatus,
                  "text-shamiri-text-dark-grey": rescheduledStatus,
                })}
              >
                <div className="flex items-center gap-1">
                  {occurredStatus && !cancelledStatus && (
                    <Icons.checkCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                  )}
                  {!occurredStatus && !cancelledStatus && !rescheduledStatus && (
                    <Icons.helpCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                  )}
                  {rescheduledStatus && (
                    <Icons.calendarCheck2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                  )}
                  {cancelledStatus && (
                    <Icons.crossCircleFilled className="h-3.5 w-3.5" strokeWidth={2.5} />
                  )}
                </div>
                {sessionDisplayName(sessionType.sessionName)}
              </div>
            </div>
          );
        })}
    </div>
  );
}
