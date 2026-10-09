import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getProps, SETORES_PADRAO, type SectorDef, type Spin } from "@/lib/roulette";

const STORAGE_KEY = "roleta-spins-v2";
const DEVICE_KEY = "roleta-public-device-id";
const CLEARED_AT_KEY = "roleta-spins-cleared-at";

interface SavedSpin {
  id: string;
  number: number;
  created_at: string;
}

function parseSavedRows(): SavedSpin[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as SavedSpin[];
    return parsed.filter((row) => Number.isInteger(row.number) && row.number >= 0 && row.number <= 36);
  } catch {
    return [];
  }
}

function mergeRows(current: SavedSpin[], incoming: SavedSpin[]): SavedSpin[] {
  const byId = new Map<string, SavedSpin>();
  for (const row of [...current, ...incoming]) byId.set(row.id, row);
  return [...byId.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 1000);
}

function gerarIdSeguro(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      /* fallback */
    }
  }
  // Fallback em formato UUID v4 válido aceito pelo PostgreSQL
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function publicDeviceId(): string {
  const saved = localStorage.getItem(DEVICE_KEY);
  if (saved) return saved;
  const created = gerarIdSeguro();
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}

export function useSpins(setores: SectorDef[] = SETORES_PADRAO) {
  const [rows, setRows] = useState<SavedSpin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    try {
      setRows(parseSavedRows());
    } catch (e) {
      console.error("Erro ao ler giros do localStorage", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;

    void supabase
      .from("public_live_spins")
      .select("id, number, created_at")
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        if (!active || error || !data) return;
        const clearedAt = localStorage.getItem(CLEARED_AT_KEY);
        const validData = clearedAt ? data.filter((row) => row.created_at > clearedAt) : data;
        setRows((current) => {
          const next = mergeRows(current, validData);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      });

    const channelName = `public-live-spins-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "public_live_spins" },
        (payload) => {
          const incoming = payload.new as SavedSpin & { device_id?: string };
          if (!Number.isInteger(incoming.number) || incoming.number < 0 || incoming.number > 36) return;
          const clearedAt = localStorage.getItem(CLEARED_AT_KEY);
          if (clearedAt && incoming.created_at <= clearedAt) return;
          setRows((current) => {
            const next = mergeRows(current, [incoming]);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
          });
        },
      );

    try {
      channel.subscribe();
    } catch (err) {
      console.warn("Falha ao subscrever canal realtime:", err);
    }

    return () => {
      active = false;
      try {
        void supabase.removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  }, []);

  const addSpins = useCallback((numbers: number[]) => {
    const validNumbers = numbers.filter((number) => Number.isInteger(number) && number >= 0 && number <= 36);
    if (!validNumbers.length) return;

    const firstCreatedAt = Date.now() - validNumbers.length + 1;
    const newSpins: SavedSpin[] = validNumbers.map((number, index) => ({
      id: gerarIdSeguro(),
      number,
      created_at: new Date(firstCreatedAt + index).toISOString(),
    }));
    setRows((prev) => {
      const next = mergeRows(prev, newSpins);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 1000)));
      return next;
    });
    void supabase
      .from("public_live_spins")
      .insert(newSpins.map((spin) => ({
        id: spin.id,
        number: spin.number,
        created_at: spin.created_at,
        device_id: publicDeviceId(),
      })))
      .then(({ error }) => {
        if (error) console.error("Erro ao sincronizar giros públicos", error.message);
      });
  }, []);

  const replaceSpins = useCallback((numbers: number[]) => {
    const validNumbers = numbers.filter((number) => Number.isInteger(number) && number >= 0 && number <= 36);
    const now = Date.now();
    // Marca o momento de limpeza para impedir que giros do Supabase anteriores a este instante sejam mesclados
    const clearTimestamp = new Date(now - validNumbers.length - 100).toISOString();
    localStorage.setItem(CLEARED_AT_KEY, clearTimestamp);

    if (!validNumbers.length) {
      localStorage.removeItem(STORAGE_KEY);
      setRows([]);
      return;
    }

    const firstCreatedAt = now - validNumbers.length + 1;
    const newSpins: SavedSpin[] = validNumbers.map((number, index) => ({
      id: gerarIdSeguro(),
      number,
      created_at: new Date(firstCreatedAt + index).toISOString(),
    }));

    // O último item de validNumbers (mais recente) terá o maior created_at
    const sorted = [...newSpins].sort((a, b) => b.created_at.localeCompare(a.created_at));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted.slice(0, 1000)));
    setRows(sorted);

    void supabase
      .from("public_live_spins")
      .insert(newSpins.map((spin) => ({
        id: spin.id,
        number: spin.number,
        created_at: spin.created_at,
        device_id: publicDeviceId(),
      })))
      .then(({ error }) => {
        if (error) console.error("Erro ao sincronizar giros públicos", error.message);
      });
  }, []);

  const addSpin = useCallback((num: number) => {
    addSpins([num]);
  }, [addSpins]);

  const undo = useCallback(() => {
    setRows((prev) => {
      const next = prev.slice(1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(CLEARED_AT_KEY, new Date().toISOString());
    setRows([]);
  }, []);

  const spins: Spin[] = rows.map((r) => ({
    id: r.id,
    num: r.number,
    props: getProps(r.number, setores),
    createdAt: r.created_at,
  }));

  return { spins, loading, addSpin, addSpins, replaceSpins, undo, clearAll, reload: load };
}
