import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Entry {
  id: string;
  playerId: string;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface Player {
  id: string;
  name: string;
  note: string | null;
  entries: Entry[];
  saldo: number;
}

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [p, e] = await Promise.all([
      supabase.from("players").select("id, name, note").order("created_at"),
      supabase
        .from("player_entries")
        .select("id, player_id, amount, note, created_at")
        .order("created_at", { ascending: false }),
    ]);
    const entries = (e.data ?? []).map((r) => ({
      id: r.id,
      playerId: r.player_id,
      amount: Number(r.amount),
      note: r.note,
      createdAt: r.created_at,
    }));
    setPlayers(
      (p.data ?? []).map((r) => {
        const own = entries.filter((x) => x.playerId === r.id);
        return {
          id: r.id,
          name: r.name,
          note: r.note,
          entries: own,
          saldo: own.reduce((a, b) => a + b.amount, 0),
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addPlayer = useCallback(
    async (name: string) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid || !name.trim()) return;
      await supabase.from("players").insert({ user_id: uid, name: name.trim() });
      await load();
    },
    [load],
  );

  const removePlayer = useCallback(
    async (id: string) => {
      await supabase.from("players").delete().eq("id", id);
      await load();
    },
    [load],
  );

  const addEntry = useCallback(
    async (playerId: string, amount: number, note?: string) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid || !amount) return;
      await supabase
        .from("player_entries")
        .insert({ user_id: uid, player_id: playerId, amount, note: note ?? null });
      await load();
    },
    [load],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      await supabase.from("player_entries").delete().eq("id", id);
      await load();
    },
    [load],
  );

  const total = players.reduce((a, b) => a + b.saldo, 0);

  return { players, loading, total, addPlayer, removePlayer, addEntry, removeEntry, reload: load };
}
