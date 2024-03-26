import { PropsWithChildren, createContext, useContext, useState } from "react";

export type Mode = "day" | "week" | "month" | "list" | "table";

interface ModeContextType {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const useMode = () => {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return context;
};

export function ModeProvider({ children }: PropsWithChildren<{}>) {
  const [mode, setMode] = useState<Mode>("month");

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}
