import type { interventionSession, interventionSessionRating, school } from "#/db/schema";
import { createContext, type Dispatch, type SetStateAction } from "react";

type SessionWithSchool = typeof interventionSession.$inferSelect & {
  school: typeof school.$inferSelect | null;
  sessionRatings: (typeof interventionSessionRating.$inferSelect)[];
};

type FellowAttendanceContextData = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  session: SessionWithSchool | null;
  setSession: Dispatch<SetStateAction<SessionWithSchool | null>>;
};

export const FellowAttendanceContext = createContext<FellowAttendanceContextData>({
  isOpen: false,
  setIsOpen: () => {},
  session: null,
  setSession: () => {},
});
