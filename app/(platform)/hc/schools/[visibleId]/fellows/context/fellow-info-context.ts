"use client";

import { SchoolFellowTableData } from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/columns";
import { createContext, Dispatch, SetStateAction } from "react";

type FellowInfoContextData = {
  groupDialog: boolean;
  setGroupDialog: Dispatch<SetStateAction<boolean>>;
  fellow: SchoolFellowTableData | null;
  setFellow: Dispatch<SetStateAction<SchoolFellowTableData | null>>;
};

export const FellowInfoContext = createContext<FellowInfoContextData>({
  groupDialog: false,
  setGroupDialog: () => {},
  fellow: null,
  setFellow: () => {},
});
