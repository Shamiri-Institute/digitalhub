import { useSearchParams } from "next/navigation";
import { type PropsWithChildren, createContext, useContext, useState } from "react";

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

export function ModeProvider({
  defaultMode,
  children,
}: PropsWithChildren<{ defaultMode: Mode }>) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const searchParams = useSearchParams();

  const setModeAndUpdateUrl = (mode: Mode) => {
    setMode(mode);
    const params = new URLSearchParams(searchParams);
    params.set("mode", mode);
    window.history.pushState(null, "", `?${params.toString()}`);
  };

  return (
    <ModeContext.Provider value={{ mode, setMode: setModeAndUpdateUrl }}>
      {children}
    </ModeContext.Provider>
  );
}
