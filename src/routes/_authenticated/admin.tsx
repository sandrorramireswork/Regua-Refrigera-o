import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, Users } from "lucide-react";
import { toast } from "sonner";
import { useConfig } from "@/hooks/useConfig";
import { useSpins } from "@/hooks/useSpins";
import {
  calcDesempenhoPadrao,
  TIPOS_REGRA,
  type Padrao,
  type PatternRule,
  type PullRules,
  type SectorDef,
} from "@/lib/roulette";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração | Roleta Pro by Sanka Master" },
      {
        name: "description",
        content:
          "Defina os padrões P1-P4, os setores do cilindro e as regras de puxa do Roleta Pro sem mexer no código.",
      },
      { property: "og:title", content: "Administração | Roleta Pro by Sanka Master" },
      {
        property: "og:description",
        content: "Configuração de padrões, setores e regras de puxa do painel de roleta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

const input =
  "w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground outline-none focus:border-neon-cyan";

function regraParaTexto(r: PatternRule): string {
  if (r.type === "colors" || r.type === "sectors") return r.sequence.join(", ");
  if (r.type === "numbers") return r.sequence.join(", ");
  return String(r.count ?? 2);
}

function textoParaRegra(tipo: PatternRule["type"], texto: string): PatternRule {
  const partes = texto
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  switch (tipo) {
    case "colors":
      return {
        type: "colors",
        sequence: partes.map((p) =>
          p.toLowerCase().startsWith("v") || p.toLowerCase() === "red"
            ? "red"
            : p.toLowerCase().startsWith("ver")
              ? "green"
              : p.toLowerCase() === "green"
                ? "green"
                : "black",
        ),
      };
    case "sectors":
      return { type: "sectors", sequence: partes };
    case "numbers":
      return { type: "numbers", sequence: partes.map(Number).filter((n) => !Number.isNaN(n)) };
    default:
      return { type: tipo, count: Math.max(2, Number(texto) || 2) } as PatternRule;
  }
}

function Admin() {
  const { padroes, setores, pullRules, isAdmin, loading, salvarPadrao, salvarSetor, salvarPullRules } =
    useConfig();
  const [pRascunho, setP] = useState<Record<string, { p: Padrao; texto: string }>>({});
  const [sRascunho, setS] = useState<Record<string, { nome: string; nums: string }>>({});
  const [regras, setRegras] = useState<PullRules>(pullRules);
  const { spins, loading: carregandoGiros } = useSpins(setores);

  const desempenhos = useMemo(() => {
    const mapa: Record<string, ReturnType<typeof calcDesempenhoPadrao>> = {};
    for (const { p, texto } of Object.values(pRascunho)) {
      mapa[p.id] = calcDesempenhoPadrao(spins, {
        ...p,
        regra: textoParaRegra(p.regra.type, texto),
      });
    }
    return mapa;
  }, [pRascunho, spins]);

  useEffect(() => {
    setP(Object.fromEntries(padroes.map((p) => [p.id, { p, texto: regraParaTexto(p.regra) }])));
  }, [padroes]);
  useEffect(() => {
    setS(
      Object.fromEntries(
        setores.map((s) => [s.id ?? s.name, { nome: s.name, nums: s.numbers.join(", ") }]),
      ),
    );
  }, [setores]);
  useEffect(() => setRegras(pullRules), [pullRules]);

  if (loading) {
    return <p className="p-6 text-center text-xs text-muted-foreground">Carregando…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-6 text-center">
        <h1 className="neon-title text-sm">Acesso restrito</h1>
        <p className="text-xs text-muted-foreground">
          Esta área é somente para o administrador.
        </p>
        <Link to="/painel" className="num-green inline-block rounded-md px-4 py-2 text-xs">
          Voltar ao painel
        </Link>
      </div>
    );
  }

  async function gravarPadrao(id: string) {
    const d = pRascunho[id];
    if (!d) return;
    const erro = await salvarPadrao({ ...d.p, regra: textoParaRegra(d.p.regra.type, d.texto) });
    toast[erro ? "error" : "success"](erro ?? `${d.p.code} salvo`);
  }

  async function gravarSetor(s: SectorDef) {
    const d = sRascunho[s.id ?? s.name];
    if (!d) return;
    const erro = await salvarSetor({
      ...s,
      name: d.nome,
      numbers: d.nums
        .split(",")
        .map((n) => Number(n.trim()))
        .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 36),
    });
    toast[erro ? "error" : "success"](erro ?? "Setor salvo");
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-3 pb-8 pt-3">
      <header className="flex items-center gap-2">
        <Link to="/painel" aria-label="Voltar" className="neon-cyan-glow rounded-md p-1.5">
          <ArrowLeft className="h-4 w-4 text-neon-cyan" />
        </Link>
        <h1 className="font-display text-base font-black text-neon-cyan">ADMINISTRAÇÃO</h1>
      </header>

      <Link
        to="/colaboradores"
        className="neon-cyan-glow flex items-center justify-between rounded-lg bg-card/60 p-3"
      >
        <span className="flex items-center gap-2">
          <Users className="h-5 w-5 text-neon-green" />
          <span>
            <strong className="block font-display text-xs text-neon-green">COLABORADORES</strong>
            <small className="text-[10px] text-muted-foreground">Ver cadastros, status e link de acesso</small>
          </span>
        </span>
        <span className="text-neon-cyan">›</span>
      </Link>

      <section className="space-y-2">
        <h2 className="neon-title text-xs">Padrões</h2>
        <p className="text-[10px] text-muted-foreground">
          Calculado com {spins.length} giros registrados neste aparelho.
        </p>
        {Object.values(pRascunho).map(({ p, texto }) => (
          <div key={p.id} className="neon-cyan-glow space-y-1.5 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-black text-neon-magenta">{p.code}</span>
              <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={p.ativa}
                  onChange={(e) =>
                    setP((s) => ({ ...s, [p.id]: { p: { ...p, ativa: e.target.checked }, texto } }))
                  }
                />
                Ativo
              </label>
            </div>
            <input
              className={input}
              value={p.nome}
              aria-label="Nome do padrão"
              onChange={(e) => setP((s) => ({ ...s, [p.id]: { p: { ...p, nome: e.target.value }, texto } }))}
            />
            <input
              className={input}
              value={p.alvos}
              aria-label="Números para entrar"
              placeholder="Números para entrar"
              onChange={(e) => setP((s) => ({ ...s, [p.id]: { p: { ...p, alvos: e.target.value }, texto } }))}
            />
            <div className="flex gap-1.5">
              <select
                className={input}
                value={p.regra.type}
                aria-label="Tipo de regra"
                onChange={(e) => {
                  const tipo = e.target.value as PatternRule["type"];
                  const nova = textoParaRegra(tipo, tipo.startsWith("repeat") ? "2" : "");
                  setP((s) => ({
                    ...s,
                    [p.id]: { p: { ...p, regra: nova }, texto: regraParaTexto(nova) },
                  }));
                }}
              >
                {TIPOS_REGRA.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input
                className={input}
                value={texto}
                aria-label="Condição da regra"
                placeholder={
                  p.regra.type.startsWith("repeat") ? "Quantas vezes seguidas" : "Ex.: red, black, red"
                }
                onChange={(e) => setP((s) => ({ ...s, [p.id]: { p, texto: e.target.value } }))}
              />
            </div>
            <div className="rounded-md border border-border/60 bg-background/40 p-1.5 text-[10px]">
              {carregandoGiros ? (
                <span className="text-muted-foreground">Lendo giros reais…</span>
              ) : (desempenhos[p.id]?.total ?? 0) === 0 ? (
                <span className="text-muted-foreground">
                  Ainda sem ocorrências fechadas nos giros reais.
                </span>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {desempenhos[p.id]!.wins}/{desempenhos[p.id]!.total} entradas com win
                    </span>
                    <span className="font-display font-black text-neon-cyan">
                      {desempenhos[p.id]!.perc.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {desempenhos[p.id]!.historico.map((r, i) => (
                      <span
                        key={i}
                        className={`rounded px-1.5 py-0.5 font-display text-[9px] font-black ${
                          r.win ? "num-green" : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {r.win ? `W${r.entrada}` : "L"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => void gravarPadrao(p.id)}
              className="num-green flex w-full items-center justify-center gap-1 rounded-md py-1.5 font-display text-[11px] font-bold"
            >
              <Save className="h-3.5 w-3.5" /> Salvar {p.code}
            </button>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="neon-title text-xs">Setores do cilindro</h2>
        {setores.map((s) => {
          const d = sRascunho[s.id ?? s.name];
          if (!d) return null;
          return (
            <div key={s.id ?? s.name} className="neon-cyan-glow space-y-1.5 rounded-lg p-2">
              <input
                className={input}
                value={d.nome}
                aria-label="Nome do setor"
                onChange={(e) =>
                  setS((st) => ({ ...st, [s.id ?? s.name]: { ...d, nome: e.target.value } }))
                }
              />
              <textarea
                className={`${input} h-16`}
                value={d.nums}
                aria-label="Números do setor"
                onChange={(e) =>
                  setS((st) => ({ ...st, [s.id ?? s.name]: { ...d, nums: e.target.value } }))
                }
              />
              <button
                onClick={() => void gravarSetor(s)}
                className="num-green flex w-full items-center justify-center gap-1 rounded-md py-1.5 font-display text-[11px] font-bold"
              >
                <Save className="h-3.5 w-3.5" /> Salvar setor
              </button>
            </div>
          );
        })}
      </section>

      <section className="neon-cyan-glow space-y-1.5 rounded-lg p-2">
        <h2 className="neon-title text-xs">Regras de puxa</h2>
        <label className="block text-[10px] text-muted-foreground">
          Repetições mínimas para aparecer
          <input
            type="number"
            min={1}
            className={input}
            value={regras.minCount}
            onChange={(e) => setRegras({ ...regras, minCount: Number(e.target.value) })}
          />
        </label>
        <label className="block text-[10px] text-muted-foreground">
          Quantos itens no ranking
          <input
            type="number"
            min={1}
            className={input}
            value={regras.topN}
            onChange={(e) => setRegras({ ...regras, topN: Number(e.target.value) })}
          />
        </label>
        <label className="block text-[10px] text-muted-foreground">
          Quantos giros recentes considerar
          <input
            type="number"
            min={2}
            className={input}
            value={regras.windowSize}
            onChange={(e) => setRegras({ ...regras, windowSize: Number(e.target.value) })}
          />
        </label>
        <button
          onClick={() =>
            void salvarPullRules(regras).then((erro) =>
              toast[erro ? "error" : "success"](erro ?? "Regras salvas"),
            )
          }
          className="num-green flex w-full items-center justify-center gap-1 rounded-md py-1.5 font-display text-[11px] font-bold"
        >
          <Save className="h-3.5 w-3.5" /> Salvar regras
        </button>
      </section>
    </div>
  );
}
