import type { Prisma } from "@prisma/client";
import { createContext, type Dispatch, type SetStateAction } from "react";

type FellowAttendanceContextData = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  session: Prisma.InterventionSessionGetPayload<{
    include: { school: true; sessionRatings: true };
  }> | null;
  setSession: Dispatch<
    SetStateAction<Prisma.InterventionSessionGetPayload<{
      include: { school: true; sessionRatings: true };
    }> | null>
  >;
};

export const FellowAttendanceContext =
  createContext<FellowAttendanceContextData>({
    isOpen: false,
    setIsOpen: () => {},
    session: null,
    setSession: () => {},
  });
