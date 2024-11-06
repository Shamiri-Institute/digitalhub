import { Prisma } from "@prisma/client";
import { createContext, Dispatch, SetStateAction } from "react";

type CancelSessionContextData = {
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

export const CancelSessionContext = createContext<CancelSessionContextData>({
  isOpen: false,
  setIsOpen: () => {},
  session: null,
  setSession: () => {},
});
