import { createContext, useContext, useState, ReactNode } from "react";

type AppContextType = {
  selectedRef: string;
  setSelectedRef: (r: string) => void;
  pressureUnit: "bar" | "psig";
  setPressureUnit: (u: "bar" | "psig") => void;
  tempUnit: "C" | "F";
  setTempUnit: (u: "C" | "F") => void;
  viewMode: "desktop" | "mobile";
  setViewMode: (v: "desktop" | "mobile") => void;
  pSuc: number;
  setPSuc: (v: number) => void;
  pLiq: number;
  setPLiq: (v: number) => void;
  tSuc: number;
  setTSuc: (v: number) => void;
  tLiq: number;
  setTLiq: (v: number) => void;
  expansion: string;
  setExpansion: (v: string) => void;
  tExt: number;
  setTExt: (v: number) => void;
  tWb: number;
  setTWb: (v: number) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedRef, setSelectedRef] = useState("R-410A");
  const [pressureUnit, setPressureUnit] = useState<"bar" | "psig">("psig");
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  
  const [pSuc, setPSuc] = useState<number>(8.5);
  const [tSuc, setTSuc] = useState<number>(10);
  
  const [pLiq, setPLiq] = useState<number>(25);
  const [tLiq, setTLiq] = useState<number>(35);
  
  const [expansion, setExpansion] = useState("txv");
  const [tExt, setTExt] = useState<number>(30);
  const [tWb, setTWb] = useState<number>(19);

  return (
    <AppContext.Provider value={{
      selectedRef, setSelectedRef,
      pressureUnit, setPressureUnit,
      tempUnit, setTempUnit,
      viewMode, setViewMode,
      pSuc, setPSuc,
      pLiq, setPLiq,
      tSuc, setTSuc,
      tLiq, setTLiq,
      expansion, setExpansion,
      tExt, setTExt,
      tWb, setTWb
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
}
