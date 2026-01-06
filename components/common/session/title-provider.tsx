import { createContext, type PropsWithChildren, useContext, useState } from "react";

interface TitleContextType {
  title: string;
  setTitle: (title: string) => void;
}

const TitleContext = createContext<TitleContextType | undefined>(undefined);

export const useTitle = () => {
  const context = useContext(TitleContext);
  if (!context) {
    throw new Error("useTitle must be used within a TitleProvider");
  }
  return context;
};

export function TitleProvider({ children }: PropsWithChildren) {
  const [title, setTitle] = useState<string>("");

  return <TitleContext.Provider value={{ title, setTitle }}>{children}</TitleContext.Provider>;
}
