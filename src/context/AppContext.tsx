import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
  tdbC: number;
  setTdbC: (v: number) => void;
  rh: number;
  setRh: (v: number) => void;
  tsupC: number;
  setTsupC: (v: number) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const loadState = <T,>(key: string, defaultValue: T): T => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(`thermomaster_${key}`);
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
  }
  return defaultValue;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedRef, setSelectedRef] = useState<string>(() => loadState("selectedRef", "R-410A"));
  const [pressureUnit, setPressureUnit] = useState<"bar" | "psig">(() => loadState("pressureUnit", "psig"));
  const [tempUnit, setTempUnit] = useState<"C" | "F">(() => loadState("tempUnit", "C"));
  const viewMode = "desktop" as const;
  const setViewMode = (_v?: "desktop" | "mobile") => {};
  
  const [pSuc, setPSuc] = useState<number>(() => loadState("pSuc", 8.5));
  const [tSuc, setTSuc] = useState<number>(() => loadState("tSuc", 10));
  
  const [pLiq, setPLiq] = useState<number>(() => loadState("pLiq", 25));
  const [tLiq, setTLiq] = useState<number>(() => loadState("tLiq", 35));
  
  const [expansion, setExpansion] = useState<string>(() => loadState("expansion", "txv"));
  const [tExt, setTExt] = useState<number>(() => loadState("tExt", 30));
  const [tWb, setTWb] = useState<number>(() => loadState("tWb", 19));

  const [tdbC, setTdbC] = useState<number>(() => loadState("tdbC", 25));
  const [rh, setRh] = useState<number>(() => loadState("rh", 50));
  const [tsupC, setTsupC] = useState<number>(() => loadState("tsupC", 13));

  useEffect(() => {
    try {
      localStorage.removeItem("thermomaster_viewMode");
    } catch (e) {}
    localStorage.setItem("thermomaster_selectedRef", JSON.stringify(selectedRef));
    localStorage.setItem("thermomaster_pressureUnit", JSON.stringify(pressureUnit));
    localStorage.setItem("thermomaster_tempUnit", JSON.stringify(tempUnit));
    localStorage.setItem("thermomaster_pSuc", JSON.stringify(pSuc));
    localStorage.setItem("thermomaster_tSuc", JSON.stringify(tSuc));
    localStorage.setItem("thermomaster_pLiq", JSON.stringify(pLiq));
    localStorage.setItem("thermomaster_tLiq", JSON.stringify(tLiq));
    localStorage.setItem("thermomaster_expansion", JSON.stringify(expansion));
    localStorage.setItem("thermomaster_tExt", JSON.stringify(tExt));
    localStorage.setItem("thermomaster_tWb", JSON.stringify(tWb));
    localStorage.setItem("thermomaster_tdbC", JSON.stringify(tdbC));
    localStorage.setItem("thermomaster_rh", JSON.stringify(rh));
    localStorage.setItem("thermomaster_tsupC", JSON.stringify(tsupC));
  }, [selectedRef, pressureUnit, tempUnit, pSuc, tSuc, pLiq, tLiq, expansion, tExt, tWb, tdbC, rh, tsupC]);

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
      tWb, setTWb,
      tdbC, setTdbC,
      rh, setRh,
      tsupC, setTsupC
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
