import { useEffect, useState } from "react";

export type Settings = {
  /** Distorção mínima (%) entre 1º e 2º lugar para considerar a mesa distorcida */
  limiteDistorcao: number;
  /** Banner master piscante de padrão confirmado */
  avisoBanner: boolean;
  /** Faixa amarela de distorção baixa / mesa equilibrada */
  avisoAmarelo: boolean;
  /** Notificação no celular */
  avisoCelular: boolean;
  /** Som do alerta */
  avisoSom: boolean;
  /** Vibração do alerta */
  avisoVibracao: boolean;
  /** Pressão mínima de confluência (%) para disparar a Entrada Nível Expert */
  pressaoConfluenciaMinima: number;
};

export const SETTINGS_PADRAO: Settings = {
  limiteDistorcao: 5,
  avisoBanner: true,
  avisoAmarelo: true,
  avisoCelular: true,
  avisoSom: true,
  avisoVibracao: true,
  pressaoConfluenciaMinima: 75,
};

const KEY = "roleta-pro-settings";
const EVENT = "roleta-pro-settings-change";

export function lerSettings(): Settings {
  if (typeof window === "undefined") return SETTINGS_PADRAO;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return SETTINGS_PADRAO;
    return { ...SETTINGS_PADRAO, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return SETTINGS_PADRAO;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(SETTINGS_PADRAO);

  useEffect(() => {
    setSettings(lerSettings());
    const sync = () => setSettings(lerSettings());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function update(patch: Partial<Settings>) {
    const next = { ...lerSettings(), ...patch };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage indisponível */
    }
    setSettings(next);
    window.dispatchEvent(new Event(EVENT));
  }

  function reset() {
    update(SETTINGS_PADRAO);
  }

  return { settings, update, reset };
}
