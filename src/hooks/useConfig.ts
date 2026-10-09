import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PADROES_PADRAO,
  PULL_RULES_PADRAO,
  SETORES_PADRAO,
  type Padrao,
  type PatternRule,
  type PullRules,
  type SectorDef,
} from "@/lib/roulette";

export function useConfig() {
  const [setores, setSetores] = useState<SectorDef[]>(SETORES_PADRAO);
  const [padroes, setPadroes] = useState<Padrao[]>(PADROES_PADRAO);
  const [pullRules, setPullRules] = useState<PullRules>(PULL_RULES_PADRAO);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [sec, pat, pr, userRes] = await Promise.all([
      supabase.from("sectors").select("id, name, numbers, position").order("position"),
      supabase
        .from("patterns")
        .select("id, code, name, targets, rule, enabled, position")
        .order("position"),
      supabase.from("pull_rules").select("min_count, top_n, window_size").maybeSingle(),
      supabase.auth.getUser(),
    ]);

    if (sec.data?.length) {
      setSetores(
        sec.data.map((s) => ({ id: s.id, name: s.name, numbers: (s.numbers ?? []) as number[] })),
      );
    }
    if (pat.data?.length) {
      setPadroes(
        pat.data.map((p) => ({
          id: p.id,
          code: p.code,
          nome: p.name,
          alvos: p.targets,
          regra: p.rule as unknown as PatternRule,
          ativa: p.enabled,
          position: p.position,
        })),
      );
    }
    if (pr.data) {
      setPullRules({
        minCount: pr.data.min_count,
        topN: pr.data.top_n,
        windowSize: pr.data.window_size,
      });
    }

    const uid = userRes.data.user?.id;
    if (uid) {
      const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      setIsAdmin(Boolean(data));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const salvarPadrao = useCallback(async (p: Padrao) => {
    const { error } = await supabase
      .from("patterns")
      .update({
        name: p.nome,
        targets: p.alvos,
        rule: p.regra as unknown as never,
        enabled: p.ativa,
      })
      .eq("id", p.id);
    if (!error) setPadroes((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    return error?.message ?? null;
  }, []);

  const salvarSetor = useCallback(async (s: SectorDef) => {
    if (!s.id) return "Setor inválido";
    const { error } = await supabase
      .from("sectors")
      .update({ name: s.name, numbers: s.numbers })
      .eq("id", s.id);
    if (!error) setSetores((prev) => prev.map((x) => (x.id === s.id ? s : x)));
    return error?.message ?? null;
  }, []);

  const salvarPullRules = useCallback(async (r: PullRules) => {
    const { error } = await supabase
      .from("pull_rules")
      .update({ min_count: r.minCount, top_n: r.topN, window_size: r.windowSize })
      .eq("singleton", true);
    if (!error) setPullRules(r);
    return error?.message ?? null;
  }, []);

  return {
    setores,
    padroes,
    pullRules,
    isAdmin,
    loading,
    reload: load,
    salvarPadrao,
    salvarSetor,
    salvarPullRules,
  };
}
