import { CalendarDate, isSameDay } from "@internationalized/date";
import { Prisma } from "@prisma/client";
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { fetchInterventionSessions } from "#/lib/actions/fetch-sessions";
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
  hubId,
}: PropsWithChildren<{
  hubId: string;
}>) {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      const fetchedSessions = await fetchInterventionSessions({ hubId });
      setSessions(fetchedSessions);
    };

    fetchSessions();
  }, [hubId]);

  return (
    <SessionsContext.Provider value={{ sessions }}>
      {children}
    </SessionsContext.Provider>
  );
}

export function useSessions({
  date,
  hour,
}: {
  date: CalendarDate;
  hour?: number;
}) {
  const context = useContext(SessionsContext);
  if (context === undefined) {
    throw new Error("useSessions must be used within a SessionsProvider");
  }

  const { sessions } = context;

  let filteredSessions = sessions.filter((session) => {
    return isSameDay(date, getCalendarDate(session.sessionDate));
  });

  if (hour) {
    filteredSessions = filteredSessions.filter((session) => {
      return session.sessionDate.getHours() === hour;
    });
  }

  return {
    sessions: filteredSessions,
  };
}
