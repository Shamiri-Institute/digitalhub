import { type CalendarDate, isSameDay } from "@internationalized/date";
import { ImplementerRole } from "#/db/enums";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

import type { Filters } from "#/lib/schedule-filters";
import { toast } from "#/components/ui/use-toast";
import { fetchInterventionSessions } from "#/lib/actions/fetch-sessions";
import { getCalendarDate, getDefaultSessionDateRange } from "#/lib/date-utils";

type SessionsContextType = {
  sessions: Session[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const SessionsContext = createContext<SessionsContextType | null>(null);

export type Session = Awaited<ReturnType<typeof fetchInterventionSessions>>[number];

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
  const [loadedFilterKey, setLoadedFilterKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const mayFetch = role !== ImplementerRole.ADMIN || !!implementerId;
  const filterKey = JSON.stringify([
    activeProjectId,
    hubId,
    implementerId,
    role,
    fellowId,
    filters.statusTypes,
    filters.dates,
    filters.dateRange?.start.toISOString(),
    filters.dateRange?.end.toISOString(),
  ]);
  const loading = loadedFilterKey !== filterKey || refreshing;

  const fetchSessions = () => {
    const { start, end } = filters.dateRange ?? getDefaultSessionDateRange();
    return fetchInterventionSessions({ start, end, filters });
  };

  const fetchForFilters = useEffectEvent(fetchSessions);

  // effect: fetches sessions whenever the filters change; server-side loading is a separate change
  useEffect(() => {
    if (!mayFetch) return;
    let cancelled = false;
    fetchForFilters()
      .then((fetchedSessions) => {
        if (!cancelled) setSessions(fetchedSessions);
      })
      .catch(() => {
        if (!cancelled) {
          toast({ variant: "destructive", description: "Could not load sessions. Please reload." });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadedFilterKey(filterKey);
      });
    return () => {
      cancelled = true;
    };
  }, [mayFetch, filterKey]);

  const refresh = async () => {
    if (!mayFetch) return;
    setRefreshing(true);
    try {
      setSessions(await fetchSessions());
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SessionsContext.Provider value={{ sessions, loading, refresh }}>
      {children}
    </SessionsContext.Provider>
  );
}

export function useSessionsContext() {
  const context = useContext(SessionsContext);
  if (!context) {
    throw new Error("useSessionsContext must be used within a SessionsProvider");
  }
  return context;
}

export function useSessions({ date, hour }: { date?: CalendarDate; hour?: number }) {
  const { sessions, loading } = useSessionsContext();

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
