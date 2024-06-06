import { CalendarDate, isSameDay } from "@internationalized/date";
import { Prisma } from "@prisma/client";
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { fetchInterventionSessions } from "#/lib/actions/fetch-sessions";
import { getCalendarDate } from "#/lib/date-utils";

type SessionsContextType = {
  sessions: Session[];
  loading: boolean;
  setSessions: Dispatch<SetStateAction<Session[]>>;
};

export const SessionsContext = createContext<SessionsContextType>({
  sessions: [],
  loading: false,
  setSessions: () => {},
});

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      const fetchedSessions = await fetchInterventionSessions({ hubId });
      setSessions(fetchedSessions);
      setLoading(false);
    };
    fetchSessions();
  }, [hubId]);

  return (
    <SessionsContext.Provider value={{ sessions, loading, setSessions }}>
      {children}
    </SessionsContext.Provider>
  );
}

export function useSessions({
  date,
  hour,
}: {
  date?: CalendarDate;
  hour?: number;
}) {
  const context = useContext(SessionsContext);
  if (context === undefined) {
    throw new Error("useSessions must be used within a SessionsProvider");
  }

  const { sessions, loading } = context;

  if (!date) {
    return { sessions, loading };
  }

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
    loading,
  };
}
