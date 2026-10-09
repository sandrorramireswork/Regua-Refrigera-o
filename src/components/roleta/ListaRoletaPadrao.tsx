import { useMemo, useState } from "react";
import {
  CILINDRO,
  calcTransicoes,
  getProps,
  vizinhos,
  VOISINS,
  TIERS,
  ORPHELINS,
  type Spin,
} from "@/lib/roulette";
import { calcEstatisticas, corDoNumero } from "./TabRodaAoVivo";

interface ListaRoletaPadraoProps {
  spins: Spin[];
  onAddSpin?: (num: number) => void;
  selectedNumber?: number | null;
  onSelectNumber?: (num: number) => void;
  compact?: boolean;
}

type FiltroSetor = "todos" | "voisins" | "tiers" | "orphelins" | "vizinhos" | "puxadas" | "atrasados";

export function ListaRoletaPadrao({
  spins,
  onAddSpin,
  selectedNumber,
  onSelectNumber,
  compact = false,
}: ListaRoletaPadraoProps) {
  const [filtro, setFiltro] = useState<FiltroSetor>("todos");
  const [focoNumero, setFocoNumero] = useState<number | null>(null);

  const activeNum = selectedNumber ?? focoNumero;
  const ultimo = spins[0]?.num;

  const estat = useMemo(() => calcEstatisticas(spins), [spins]);
  const maxQtd = useMemo(() => Math.max(1, ...estat.map((e) => e.qtd)), [estat]);

  // Vizinhos do último número sorteado (2 para cada lado na roleta)
  const amarelos = useMemo(
    () => (ultimo === undefined ? new Set<number>() : new Set(vizinhos(ultimo, 2))),
    [ultimo],
  );

  // Números puxados diretamente pelo último número
  const puxadas = useMemo(() => {
    if (ultimo === undefined) return [];
    return calcTransicoes(spins, { minCount: 1, topN: 2000, windowSize: 1000 })
      .filter((t) => t.origem === ultimo)
      .sort((a, b) => b.qtd - a.qtd || b.perc - a.perc)
      .slice(0, 5)
      .map((t) => ({ destino: t.destino, qtd: t.qtd, perc: t.perc }));
  }, [spins, ultimo]);

  const verdes = useMemo(() => new Set(puxadas.map((p) => p.destino)), [puxadas]);

  // Puxadas dos vizinhos do último (ciano)
  const puxadasVizinhos = useMemo(() => {
    if (ultimo === undefined) return [];
    const todas = calcTransicoes(spins, { minCount: 1, topN: 5000, windowSize: 1000 });
    return vizinhos(ultimo, 2)
      .filter((v) => v !== ultimo)
      .map((vz) => ({
        vizinho: vz,
        alvos: todas
          .filter((t) => t.origem === vz)
          .sort((a, b) => b.qtd - a.qtd || b.perc - a.perc)
          .slice(0, 3)
          .map((t) => ({ destino: t.destino, qtd: t.qtd, perc: t.perc })),
      }));
  }, [spins, ultimo]);

  const cianos = useMemo(
    () => new Set(puxadasVizinhos.flatMap((v) => v.alvos.map((a) => a.destino))),
    [puxadasVizinhos],
  );

  // Mapa de transições globais para ver o que cada número da roleta padrão puxa
  const transicoesPorNumero = useMemo(() => {
    const todas = calcTransicoes(spins, { minCount: 1, topN: 5000, windowSize: 1000 });
    const mapa = new Map<number, { destino: number; qtd: number; perc: number }[]>();
    todas.forEach((t) => {
      const lista = mapa.get(t.origem) ?? [];
      if (lista.length < 3) {
        lista.push({ destino: t.destino, qtd: t.qtd, perc: t.perc });
        mapa.set(t.origem, lista);
      }
    });
    return mapa;
  }, [spins]);

  // Lista dos 37 números organizada na ORDEM DA ROLETA PADRÃO (CILINDRO)
  const itensCilindro = useMemo(() => {
    return CILINDRO.map((num, idxCilindro) => {
      const st = estat[num] ?? { num, qtd: 0, perc: 0, maiorEspera: 0, esperaAtual: 0 };
      const props = getProps(num);
      const ehUltimo = num === ultimo;
      const ehVizinho = amarelos.has(num);
      const ehPuxada = verdes.has(num);
      const ehCiano = cianos.has(num);
      const puxa = transicoesPorNumero.get(num) ?? [];

      return {
        ...st,
        posicao: idxCilindro + 1, // 1º ao 37º
        cor: props.cor,
        setor: props.setor,
        ehUltimo,
        ehVizinho,
        ehPuxada,
        ehCiano,
        puxa,
      };
    });
  }, [amarelos, cianos, estat, transicoesPorNumero, ultimo, verdes]);

  // Filtragem conforme botão selecionado
  const itensFiltrados = useMemo(() => {
    switch (filtro) {
      case "voisins":
        return itensCilindro.filter((it) => VOISINS.includes(it.num));
      case "tiers":
        return itensCilindro.filter((it) => TIERS.includes(it.num));
      case "orphelins":
        return itensCilindro.filter((it) => ORPHELINS.includes(it.num));
      case "vizinhos":
        return itensCilindro.filter((it) => it.ehVizinho || it.ehUltimo);
      case "puxadas":
        return itensCilindro.filter((it) => it.ehPuxada || it.ehCiano);
      case "atrasados": {
        // Ordena pelos maiores atrasos atuais, mantendo indicação da roleta
        return [...itensCilindro].sort((a, b) => b.esperaAtual - a.esperaAtual).slice(0, 12);
      }
      case "todos":
      default:
        return itensCilindro; // Ordem rigorosa da Roleta Padrão (Cilindro)
    }
  }, [filtro, itensCilindro]);

  // Destaques estatísticos gerais
  const maisAtrasado = useMemo(() => {
    return [...estat].sort((a, b) => b.esperaAtual - a.esperaAtual)[0];
  }, [estat]);

  const maisFrequente = useMemo(() => {
    return [...estat].sort((a, b) => b.qtd - a.qtd)[0];
  }, [estat]);

  const handleClickNumero = (num: number) => {
    setFocoNumero((prev) => (prev === num ? null : num));
    if (onSelectNumber) onSelectNumber(num);
  };

  return (
    <div className="space-y-3">
      {/* Header Resumo da Roleta Padrão */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-neon-cyan shadow-[0_0_8px_#00E5FF]" />
            <h3 className="font-display text-sm font-black uppercase tracking-wider text-neon-cyan">
              Lista Roleta Padrão (Cilindro Europeu)
            </h3>
            <span className="rounded bg-neon-cyan/20 px-1.5 py-0.5 text-[9px] font-bold text-neon-cyan">
              37 números · Sequência Oficial
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Ordem física real da roleta: 0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6... até 26
          </div>
        </div>

        {/* KPIs de topo */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {maisAtrasado && (
            <div className="rounded border border-neon-gold/50 bg-neon-gold/10 px-2 py-1 text-[10px]">
              <span className="text-muted-foreground">Mais Atrasado: </span>
              <span className="font-display font-black text-neon-gold">
                Nº {maisAtrasado.num} ({maisAtrasado.esperaAtual} giros)
              </span>
            </div>
          )}
          {maisFrequente && (
            <div className="rounded border border-neon-green/50 bg-neon-green/10 px-2 py-1 text-[10px]">
              <span className="text-muted-foreground">Mais Quente: </span>
              <span className="font-display font-black text-neon-green">
                Nº {maisFrequente.num} ({maisFrequente.qtd}x · {maisFrequente.perc.toFixed(0)}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Trilha Linear Horizontal do Cilindro (Roleta Desenrolada) */}
      <div className="rounded-lg border border-neon-cyan/30 bg-card/60 p-2">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
          <span className="font-bold uppercase tracking-wider text-foreground">
            Trilha Sequencial do Cilindro
          </span>
          <span className="text-[9px]">Clique em qualquer número para filtrar ou inspecionar</span>
        </div>

        <div className="relative flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-muted">
          {itensCilindro.map((it) => {
            const isSelected = activeNum === it.num;
            return (
              <button
                key={it.num}
                type="button"
                onClick={() => handleClickNumero(it.num)}
                title={`Posição ${it.posicao}º no cilindro · Nº ${it.num} (${it.setor}) · ${it.qtd} saídas · espera ${it.esperaAtual} giros`}
                className={`relative flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded transition-all ${
                  it.ehUltimo
                    ? "ring-2 ring-white scale-110 z-10 shadow-[0_0_12px_#ffffff]"
                    : it.ehPuxada
                      ? "ring-2 ring-neon-green shadow-[0_0_8px_#00FF7F]"
                      : it.ehVizinho
                        ? "ring-2 ring-neon-gold shadow-[0_0_8px_#FFD600]"
                        : it.ehCiano
                          ? "ring-1 ring-neon-cyan shadow-[0_0_6px_#00E5FF]"
                          : isSelected
                            ? "ring-2 ring-neon-magenta scale-105"
                            : "opacity-85 hover:opacity-100 hover:scale-105"
                }`}
                style={{
                  background: corDoNumero(it.num),
                  border: corDoNumero(it.num) === "#000000" ? "1.5px solid #FFFFFF" : corDoNumero(it.num) === "#FF003C" ? "1.5px solid #FF003C" : "1.5px solid #00FF88",
                  boxShadow: corDoNumero(it.num) === "#FF003C" ? "0 0 10px rgba(255, 0, 60, 0.85)" : corDoNumero(it.num) === "#000000" ? "0 0 8px rgba(255, 255, 255, 0.75)" : "0 0 10px rgba(0, 255, 136, 0.85)",
                }}
              >
                <span className="text-[10px] font-black text-white leading-none">
                  {it.num}
                </span>
                <span className="text-[7px] font-mono text-white/70 leading-none">
                  {it.qtd}x
                </span>
                {it.ehUltimo && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-white animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de Filtros Rápidos */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-md border border-border/50 bg-background/50 p-1.5">
        <div className="flex flex-wrap items-center gap-1 text-[10px]">
          <span className="text-[9px] uppercase text-muted-foreground mr-1">Filtrar:</span>
          <button
            onClick={() => setFiltro("todos")}
            className={`rounded px-2 py-0.5 font-bold transition-all ${
              filtro === "todos"
                ? "bg-neon-cyan text-black shadow-[0_0_8px_#00E5FF]"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            Roleta Padrão (37)
          </button>
          <button
            onClick={() => setFiltro("voisins")}
            className={`rounded px-2 py-0.5 font-bold transition-all ${
              filtro === "voisins"
                ? "bg-neon-cyan text-black shadow-[0_0_8px_#00E5FF]"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            Voisins (17)
          </button>
          <button
            onClick={() => setFiltro("tiers")}
            className={`rounded px-2 py-0.5 font-bold transition-all ${
              filtro === "tiers"
                ? "bg-neon-magenta text-white shadow-[0_0_8px_#FF2E9A]"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            Tiers (12)
          </button>
          <button
            onClick={() => setFiltro("orphelins")}
            className={`rounded px-2 py-0.5 font-bold transition-all ${
              filtro === "orphelins"
                ? "bg-neon-gold text-black shadow-[0_0_8px_#FFD600]"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            Orphelins (8)
          </button>
          <button
            onClick={() => setFiltro("vizinhos")}
            className={`rounded px-2 py-0.5 font-bold transition-all ${
              filtro === "vizinhos"
                ? "bg-neon-gold text-black shadow-[0_0_8px_#FFD600]"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            Vizinhos do Último ({amarelos.size})
          </button>
          <button
            onClick={() => setFiltro("puxadas")}
            className={`rounded px-2 py-0.5 font-bold transition-all ${
              filtro === "puxadas"
                ? "bg-neon-green text-black shadow-[0_0_8px_#00FF7F]"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            Puxadas Ativas ({verdes.size})
          </button>
          <button
            onClick={() => setFiltro("atrasados")}
            className={`rounded px-2 py-0.5 font-bold transition-all ${
              filtro === "atrasados"
                ? "bg-neon-magenta text-white shadow-[0_0_8px_#FF2E9A]"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            Top Atrasados
          </button>
        </div>

        {/* Legenda rápida */}
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full border border-white bg-white/20" /> Último
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full border border-neon-gold bg-neon-gold/20" /> Vizinhos
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full border border-neon-green bg-neon-green/20" /> Puxada
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full border border-neon-cyan bg-neon-cyan/20" /> Viz. Puxa
          </span>
        </div>
      </div>

      {/* Grade Principal dos Cards Conforme o Exemplo da Roda ao Vivo */}
      <section className="neon-cyan-glow rounded-lg p-2.5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {itensFiltrados.map((e) => {
            const isSelected = activeNum === e.num;
            return (
              <div
                key={e.num}
                onClick={() => handleClickNumero(e.num)}
                className={`relative cursor-pointer overflow-hidden rounded-md border p-2 transition-all hover:bg-muted/20 ${
                  isSelected ? "ring-2 ring-neon-cyan shadow-[0_0_12px_#00E5FF]" : ""
                }`}
                style={{
                  borderColor: e.ehUltimo
                    ? "#FFFFFF"
                    : e.ehPuxada
                      ? "#00FF7F"
                      : e.ehVizinho
                        ? "#FFD600"
                        : e.ehCiano
                          ? "#00E5FF"
                          : "#00E5FF33",
                  backgroundColor: e.ehUltimo
                    ? "rgba(255, 255, 255, 0.07)"
                    : e.ehPuxada
                      ? "rgba(0, 255, 127, 0.06)"
                      : e.ehVizinho
                        ? "rgba(255, 214, 0, 0.06)"
                        : "transparent",
                }}
                title={`Nº ${e.num} · Posição na Roleta: ${e.posicao}º · Setor: ${e.setor}\n${e.qtd} saídas (${e.perc.toFixed(1)}%)\nMaior espera histórica: ${e.maiorEspera} giros\nSem sair há: ${e.esperaAtual} giros`}
              >
                {/* Linha superior: Posição na roleta e Setor */}
                <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
                  <span className="font-mono font-bold">
                    #{e.posicao} roleta
                  </span>
                  <span
                    className={`rounded px-1 py-0.2 text-[8px] font-black uppercase ${
                      e.setor.startsWith("V")
                        ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40"
                        : e.setor.startsWith("T")
                          ? "bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/40"
                          : "bg-neon-gold/20 text-neon-gold border border-neon-gold/40"
                    }`}
                  >
                    {e.setor}
                  </span>
                </div>

                {/* Linha Central: Badge do número + Saídas + Máxima histórica */}
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-display text-[14px] font-black text-white shadow-md"
                    style={{
                      background: corDoNumero(e.num),
                      border: corDoNumero(e.num) === "#000000" ? "1.5px solid #FFFFFF" : corDoNumero(e.num) === "#FF003C" ? "1.5px solid #FF003C" : "1.5px solid #00FF88",
                      boxShadow: corDoNumero(e.num) === "#FF003C" ? "0 0 10px rgba(255, 0, 60, 0.85)" : corDoNumero(e.num) === "#000000" ? "0 0 8px rgba(255, 255, 255, 0.75)" : "0 0 10px rgba(0, 255, 136, 0.85)",
                    }}
                  >
                    {e.num}
                  </span>

                  <div className="flex flex-col">
                    <span className="font-display text-base font-black text-foreground drop-shadow-[0_0_6px_var(--foreground)] leading-none">
                      {e.qtd}x
                    </span>
                    <span className="text-[9px] text-muted-foreground mt-0.5">
                      {e.perc.toFixed(1)}%
                    </span>
                  </div>

                  <div className="ml-auto text-right leading-tight">
                    <div className="text-[9px] font-black text-neon-gold">
                      máx {e.maiorEspera}
                    </div>
                    <div className="text-[8px] font-bold text-muted-foreground">
                      espera: <span className={e.esperaAtual >= e.maiorEspera && e.maiorEspera > 0 ? "text-neon-magenta font-black" : "text-foreground"}>{e.esperaAtual}</span>
                    </div>
                  </div>
                </div>

                {/* Barra de repetições proporcional estilo neon */}
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-foreground shadow-[0_0_8px_var(--foreground)]"
                    style={{ width: `${(e.qtd / maxQtd) * 100}%` }}
                  />
                </div>

                {/* Puxadas deste número (Top 2 alvos de transição) */}
                {e.puxa && e.puxa.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1 border-t border-border/30 pt-1 text-[8px] text-muted-foreground">
                    <span className="shrink-0 font-bold uppercase text-neon-green">puxa:</span>
                    <div className="flex flex-wrap gap-1">
                      {e.puxa.slice(0, 2).map((p) => (
                        <span
                          key={p.destino}
                          className="rounded bg-neon-green/15 px-1 py-0.2 font-mono font-bold text-neon-green"
                        >
                          {p.destino} ({p.qtd}x)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Badge contextual de status */}
                {e.ehUltimo && (
                  <div className="mt-1 rounded bg-white/20 py-0.5 text-center text-[8px] font-black uppercase text-white tracking-wider">
                    ★ Último Resultado
                  </div>
                )}
                {e.ehPuxada && !e.ehUltimo && (
                  <div className="mt-1 rounded bg-neon-green/20 py-0.5 text-center text-[8px] font-black uppercase text-neon-green tracking-wider">
                    Puxando Agora
                  </div>
                )}
                {e.ehVizinho && !e.ehUltimo && (
                  <div className="mt-1 rounded bg-neon-gold/20 py-0.5 text-center text-[8px] font-black uppercase text-neon-gold tracking-wider">
                    Vizinho do Último
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
