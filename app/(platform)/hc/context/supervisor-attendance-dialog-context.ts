import { Prisma } from "@prisma/client";
import { createContext, Dispatch, SetStateAction } from "react";

type SupervisorAttendanceContextData = {
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

export const SupervisorAttendanceContext =
  createContext<SupervisorAttendanceContextData>({
    isOpen: false,
    setIsOpen: () => {},
    session: null,
    setSession: () => {},
  });
