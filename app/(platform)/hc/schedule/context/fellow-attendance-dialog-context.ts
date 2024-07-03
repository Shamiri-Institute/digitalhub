import { Prisma } from "@prisma/client";
import { createContext, Dispatch, SetStateAction } from "react";

type FellowAttendanceContextData = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  session: Prisma.InterventionSessionGetPayload<{
    include: { school: true };
  }> | null;
  setSession: Dispatch<
    SetStateAction<Prisma.InterventionSessionGetPayload<{
      include: { school: true };
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
