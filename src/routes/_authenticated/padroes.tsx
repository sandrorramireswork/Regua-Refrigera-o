import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { useConfig } from "@/hooks/useConfig";
import { useSpins } from "@/hooks/useSpins";
import { regraParaTexto, textoParaRegra } from "@/lib/pattern-rules";
import {
  calcDesempenhoPadrao,
  TIPOS_REGRA,
  type Padrao,
  type PatternRule,
} from "@/lib/roulette";

export const Route = createFileRoute("/_authenticated/padroes")({
  head: () => ({
    meta: [
      { title: "Editor de Padrões | Roleta Pro by Sanka Master" },
      {
        name: "description",
        content:
          "Defina os números de entrada e as regras de cada um dos 35 padrões em uma tela própria, com o aproveitamento calculado pelos giros deste aparelho.",
      },
      { property: "og:title", content: "Editor de Padrões | Roleta Pro by Sanka Master" },
      {
        property: "og:description",
        content: "Alvos, regras e aproveitamento real de cada padrão em uma só tela.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditorPadroes,
});

const input =
  "w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground outline-none focus:border-neon-cyan";

interface Rascunho {
  p: Padrao;
  texto: string;
  sujo: boolean;
}

function EditorPadroes() {
  const { padroes, setores, isAdmin, loading, salvarPadrao } = useConfig();
  const { spins } = useSpins(setores);
  const [busca, setBusca] = useState("");
  const [soAtivos, setSoAtivos] = useState(false);
  const [rasc, setRasc] = useState<Record<string, Rascunho>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setRasc(
      Object.fromEntries(
        padroes.map((p) => [p.id, { p, texto: regraParaTexto(p.regra), sujo: false }]),
      ),
    );
  }, [padroes]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return Object.values(rasc)
      .filter((d) => (soAtivos ? d.p.ativa : true))
      .filter(
        (d) =>
          termo === "" ||
          d.p.code.toLowerCase().includes(termo) ||
          d.p.nome.toLowerCase().includes(termo) ||
          d.p.alvos.toLowerCase().includes(termo),
      )
      .sort((a, b) => a.p.position - b.p.position);
  }, [rasc, busca, soAtivos]);

  const desempenhos = useMemo(() => {
    const mapa: Record<string, ReturnType<typeof calcDesempenhoPadrao>> = {};
    for (const d of Object.values(rasc)) {
      mapa[d.p.id] = calcDesempenhoPadrao(spins, {
        ...d.p,
        regra: textoParaRegra(d.p.regra.type, d.texto),
      });
    }
    return mapa;
  }, [rasc, spins]);

  function mudar(id: string, patch: Partial<Padrao>, texto?: string) {
    setRasc((s) => {
      const atual = s[id];
      if (!atual) return s;
      return {
        ...s,
        [id]: { p: { ...atual.p, ...patch }, texto: texto ?? atual.texto, sujo: true },
      };
    });
  }

  async function gravar(id: string) {
    const d = rasc[id];
    if (!d) return;
    const erro = await salvarPadrao({ ...d.p, regra: textoParaRegra(d.p.regra.type, d.texto) });
    if (erro) {
      toast.error(erro);
      return;
    }
    setRasc((s) => (s[id] ? { ...s, [id]: { ...s[id]!, sujo: false } } : s));
    toast.success(`${d.p.code} salvo`);
  }

  async function gravarTudo() {
    setSalvando(true);
    const sujos = Object.values(rasc).filter((d) => d.sujo);
    for (const d of sujos) await gravar(d.p.id);
    setSalvando(false);
    if (sujos.length === 0) toast.info("Nada alterado");
  }

  if (loading) {
    return <p className="p-6 text-center text-xs text-muted-foreground">Carregando…</p>;
  }

  const pendentes = Object.values(rasc).filter((d) => d.sujo).length;

  return (
    <div className="mx-auto max-w-2xl space-y-3 px-3 pb-24 pt-3">
      <header className="flex items-center gap-2">
        <Link to="/painel" aria-label="Voltar" className="neon-cyan-glow rounded-md p-1.5">
          <ArrowLeft className="h-4 w-4 text-neon-cyan" />
        </Link>
        <h1 className="font-display text-base font-black text-neon-cyan">EDITOR DE PADRÕES</h1>
      </header>

      <p className="text-[10px] text-muted-foreground">
        Aproveitamento calculado com {spins.length} giros deste aparelho.
        {!isAdmin && " · somente o administrador pode salvar."}
      </p>

      <div className="flex items-center gap-2">
        <input
          className={input}
          placeholder="Buscar padrão, nome ou alvo"
          aria-label="Buscar padrão"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <label className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
          <input
            type="checkbox"
            checked={soAtivos}
            onChange={(e) => setSoAtivos(e.target.checked)}
          />
          Só ativos
        </label>
      </div>

      <div className="space-y-2">
        {lista.map(({ p, texto, sujo }) => {
          const d = desempenhos[p.id];
          return (
            <div
              key={p.id}
              className={`space-y-1.5 rounded-lg p-2 ${sujo ? "border border-neon-gold" : "neon-cyan-glow"}`}
            >
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-black text-neon-magenta">{p.code}</span>
                <span className="truncate text-[10px] text-muted-foreground">{p.nome}</span>
                <span className="ml-auto text-[10px] font-black text-neon-green">
                  {d && d.total > 0 ? `${d.perc.toFixed(0)}% · ${d.wins}/${d.total}` : "sem base"}
                </span>
              </div>

              <input
                className={input}
                value={p.nome}
                aria-label={`Nome do ${p.code}`}
                onChange={(e) => mudar(p.id, { nome: e.target.value })}
              />
              <input
                className={input}
                value={p.alvos}
                placeholder="Números de entrada, ex.: 19, 29, 17"
                aria-label={`Alvos do ${p.code}`}
                onChange={(e) => mudar(p.id, { alvos: e.target.value })}
              />
              <div className="flex gap-1.5">
                <select
                  className={input}
                  value={p.regra.type}
                  aria-label={`Tipo de regra do ${p.code}`}
                  onChange={(e) => {
                    const tipo = e.target.value as PatternRule["type"];
                    const nova = textoParaRegra(tipo, tipo.startsWith("repeat") ? "2" : "");
                    mudar(p.id, { regra: nova }, regraParaTexto(nova));
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
                  aria-label={`Regra do ${p.code}`}
                  placeholder={p.regra.type.startsWith("repeat") ? "quantidade" : "sequência"}
                  onChange={(e) => mudar(p.id, {}, e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={p.ativa}
                    onChange={(e) => mudar(p.id, { ativa: e.target.checked })}
                  />
                  Ativo
                </label>
                <button
                  onClick={() => void gravar(p.id)}
                  disabled={!isAdmin}
                  className="num-green ml-auto rounded-md px-3 py-1 text-[10px] font-black disabled:opacity-40"
                >
                  <Save className="mr-1 inline h-3 w-3" />
                  Salvar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 p-2 backdrop-blur">
        <button
          onClick={() => void gravarTudo()}
          disabled={!isAdmin || salvando}
          className="num-green mx-auto block w-full max-w-2xl rounded-md py-2 text-xs font-black disabled:opacity-40"
        >
          {salvando ? "Salvando…" : `Salvar alterações (${pendentes})`}
        </button>
      </div>
    </div>
  );
}
