import { SupervisorAttendanceTableData } from "#/app/(platform)/hc/components/supervisor-attendance";
import { Prisma } from "@prisma/client";
import { createContext, Dispatch, SetStateAction } from "react";

type SupervisorAttendanceContextData = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  markAttendanceDialog: boolean;
  setMarkAttendanceDialog: Dispatch<SetStateAction<boolean>>;
  session: Prisma.InterventionSessionGetPayload<{
    include: { school: true; sessionRatings: true; session: true };
  }> | null;
  setSession: Dispatch<
    SetStateAction<Prisma.InterventionSessionGetPayload<{
      include: { school: true; sessionRatings: true; session: true };
    }> | null>
  >;
  attendance: SupervisorAttendanceTableData | null;
  setAttendance: Dispatch<SetStateAction<SupervisorAttendanceTableData | null>>;
};

export const SupervisorAttendanceContext =
  createContext<SupervisorAttendanceContextData>({
    isOpen: false,
    setIsOpen: () => {},
    session: null,
    setSession: () => {},
    markAttendanceDialog: false,
    setMarkAttendanceDialog: () => {},
    attendance: null,
    setAttendance: () => {},
  });
