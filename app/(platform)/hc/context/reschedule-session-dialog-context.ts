import { createContext, type Dispatch, type SetStateAction } from "react";
import type { Session } from "#/components/common/session/sessions-provider";

type RescheduleSessionContextData = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  session: Session | null;
  setSession: Dispatch<SetStateAction<Session | null>>;
};

export const RescheduleSessionContext = createContext<RescheduleSessionContextData>({
  isOpen: false,
  setIsOpen: () => {},
  session: null,
  setSession: () => {},
});
