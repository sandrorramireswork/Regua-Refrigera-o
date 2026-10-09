import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GameEntry {
  id: string;
  patternCode: string;
  bet: number;
  result: number;
  note: string | null;
  createdAt: string;
}

export function useGameEntries() {
  const [entries, setEntries] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("game_entries")
      .select("id, pattern_code, bet, result, note, created_at")
      .order("created_at", { ascending: false });
    setEntries(
      (data ?? []).map((row) => ({
        id: row.id,
        patternCode: row.pattern_code,
        bet: Number(row.bet),
        result: Number(row.result),
        note: row.note,
        createdAt: row.created_at,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addEntry = useCallback(
    async (input: { patternCode: string; bet: number; result: number; note?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return "Sessão expirada.";
      const { error } = await supabase.from("game_entries").insert({
        user_id: userId,
        pattern_code: input.patternCode,
        bet: input.bet,
        result: input.result,
        note: input.note?.trim() || null,
      });
      if (error) return error.message;
      await load();
      return null;
    },
    [load],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      await supabase.from("game_entries").delete().eq("id", id);
      await load();
    },
    [load],
  );

  const totalResult = useMemo(() => entries.reduce((sum, entry) => sum + entry.result, 0), [entries]);
  const totalBet = useMemo(() => entries.reduce((sum, entry) => sum + entry.bet, 0), [entries]);
  const wins = useMemo(() => entries.filter((entry) => entry.result > 0).length, [entries]);

  return { entries, loading, totalResult, totalBet, wins, addEntry, removeEntry };
}