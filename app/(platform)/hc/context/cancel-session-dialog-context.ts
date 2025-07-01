import { createContext, type Dispatch, type SetStateAction } from "react";
import type { Session } from "#/components/common/session/sessions-provider";

type CancelSessionContextData = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  session: Session | null;
  setSession: Dispatch<SetStateAction<Session | null>>;
};

export const CancelSessionContext = createContext<CancelSessionContextData>({
  isOpen: false,
  setIsOpen: () => {},
  session: null,
  setSession: () => {},
});
