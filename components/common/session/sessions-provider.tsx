import { type CalendarDate, isSameDay } from "@internationalized/date";
import type { Prisma } from "@prisma/client";
import { ImplementerRole } from "#/db/enums";
import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

import type { Filters } from "#/app/(platform)/hc/schedule/context/filters-context";
import { fetchInterventionSessions } from "#/lib/actions/fetch-sessions";
import { getCalendarDate, getDefaultSessionDateRange } from "#/lib/date-utils";

type SessionsContextType = {
  sessions: Session[];
  loading: boolean;
  setSessions: Dispatch<SetStateAction<Session[]>>;
  refresh: () => Promise<void>;
};

export const SessionsContext = createContext<SessionsContextType>({
  sessions: [],
  loading: false,
  setSessions: () => {},
  refresh: () => Promise.resolve(),
});

export type Session = Prisma.InterventionSessionGetPayload<{
  include: {
    hub: {
      select: { visibleId: true };
    };
    school: {
      include: {
        interventionGroups: {
          include: {
            leader: {
              select: { fellowName: true };
            };
            students: {
              include: {
                _count: {
                  select: {
                    clinicalCases: true;
                  };
                };
              };
            };
          };
        };
      };
    };
    sessionRatings: true;
    session: true;
  };
}>;

export function SessionsProvider({
  children,
  activeProjectId,
  hubId,
  implementerId,
  filters,
  role,
  fellowId,
}: PropsWithChildren<{
  activeProjectId?: string | null;
  hubId?: string;
  implementerId?: string;
  filters: Filters;
  role: ImplementerRole;
  fellowId?: string;
}>) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    if ((role === ImplementerRole.ADMIN && implementerId) || role !== ImplementerRole.ADMIN) {
      setLoading(true);
      const { start, end } = filters.dateRange ?? getDefaultSessionDateRange();
      const fetchedSessions = await fetchInterventionSessions({
        activeProjectId,
        hubId,
        implementerId,
        role,
        start,
        end,
        filters,
        fellowId,
      });
      setSessions(fetchedSessions);
      setLoading(false);
    }
  };

  const dateRangeKey = filters.dateRange
    ? `${filters.dateRange.start.toISOString()}-${filters.dateRange.end.toISOString()}`
    : null;

  const fetchForFilters = useEffectEvent(() => {
    void fetchSessions();
  });

  // effect: fetches sessions whenever the filters change; server-side loading is a separate change
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetches sessions whenever the filters change; server-side loading is a separate change
    fetchForFilters();
  }, [
    activeProjectId,
    hubId,
    implementerId,
    role,
    fellowId,
    filters.statusTypes,
    filters.dates,
    dateRangeKey,
  ]);

  const refresh = () => fetchSessions();

  return (
    <SessionsContext.Provider value={{ sessions, loading, setSessions, refresh }}>
      {children}
    </SessionsContext.Provider>
  );
}

export function useSessions({ date, hour }: { date?: CalendarDate; hour?: number }) {
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
