import { CalendarDate, isSameDay } from "@internationalized/date";
import { Prisma } from "@prisma/client";
import React, { createContext, useContext } from "react";

import { getCalendarDate } from "#/lib/date-utils";

const SessionsContext = createContext<SessionsContextType | undefined>(
  undefined,
);

type SessionsContextType = {
  sessions: Session[];
};

export type Session = Prisma.InterventionSessionGetPayload<{
  include: { school: true };
}>;

export function SessionsProvider({
  children,
  sessions,
}: React.PropsWithChildren<{
  sessions: Session[];
}>) {
  return (
    <SessionsContext.Provider value={{ sessions }}>
      {children}
    </SessionsContext.Provider>
  );
}

export function useSessions(date: CalendarDate) {
  const context = useContext(SessionsContext);
  if (context === undefined) {
    throw new Error("useSessions must be used within a SessionsProvider");
  }

  const { sessions } = context;

  const filteredSessions = sessions.filter((session) => {
    return isSameDay(date, getCalendarDate(session.sessionDate));
  });

  return {
    sessions: filteredSessions,
  };
}
