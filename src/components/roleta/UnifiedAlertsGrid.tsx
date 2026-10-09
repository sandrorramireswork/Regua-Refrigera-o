import { useMemo } from "react";
import { Flame, Zap, AlertTriangle, ShieldCheck, X, ChevronRight, Layers, Target, Sparkles, CheckCircle2, TrendingUp } from "lucide-react";
import type { UnifiedAlertItem, ConfluenceGroup } from "@/lib/alert-confluence";
import { corDoNumero } from "./TabRodaAoVivo";
import type { Spin, SectorDef } from "@/lib/roulette";
import { BallisticFavoritesGrid } from "./BallisticFavoritesGrid";
import { DecisionEngineAlertCard } from "./DecisionEngineAlertCard";

interface UnifiedAlertsGridProps {
  alerts: UnifiedAlertItem[];
  confluence: ConfluenceGroup | null;
  onSelectNumber?: ((num: number) => void) | undefined;
  onSelectTab?: ((tabName: string) => void) | undefined;
  // Propriedades do estado Standby / Monitoramento quando nenhum alerta estiver ativo
  ultimo?: Spin | null | undefined;
  puxada?: { destino: number; qtd: number; perc: number } | null | undefined;
  propsPuxada?: { cor: string; setor: string } | null | undefined;
  letraSetor?: string | undefined;
  letraPuxada?: string | undefined;
  forteDuzia?: { idx: number; perc: number } | undefined;
  forteColuna?: { idx: number; perc: number } | undefined;
  tend?: {
    paridade: { nome: string; perc: number };
    maiorMenor: { nome: string; perc: number };
    cor: { nome: string; perc: number };
  } | null | undefined;
  zona?: { numeros: number[]; qtd: number; perc: number } | null | undefined;
  quentes?: { num: number; qtd: number }[] | undefined;
  grupos?: { total: number } | undefined;
  spins?: Spin[] | undefined;
  setores?: SectorDef[] | undefined;
}

const COLOR_CLASSES = {
  gold: "border-neon-gold/70 text-neon-gold bg-neon-gold/10",
  green: "border-neon-green/70 text-neon-green bg-neon-green/10",
  cyan: "border-neon-cyan/70 text-neon-cyan bg-neon-cyan/10",
  magenta: "border-neon-magenta/70 text-neon-magenta bg-neon-magenta/10",
  red: "border-neon-red/70 text-neon-red bg-neon-red/10",
  white: "border-white/60 text-white bg-white/10",
} as const;

export function UnifiedAlertsGrid({
  alerts,
  confluence,
  onSelectNumber,
  onSelectTab,
  ultimo,
  puxada,
  propsPuxada,
  letraSetor,
  letraPuxada,
  forteDuzia,
  forteColuna,
  tend,
  zona,
  quentes,
  grupos,
  spins,
  setores,
}: UnifiedAlertsGridProps) {
  // FILTRO ESTRITO DE ALTA ASSERTIVIDADE:
  // Somente alertar quando estiver com assertividade alta para entrada (>= 70% G1)
  const isHighConfluence = useMemo(() => {
    return Boolean(
      confluence &&
      confluence.hasConfluence &&
      confluence.combinedAccuracy2Entries >= 70 &&
      confluence.tactical?.decision.veredicto !== "aguardar"
    );
  }, [confluence]);

  // Alertas individuais filtrados estritamente para alta assertividade (>= 70% G1 e não aguardar)
  const highAssertiveAlerts = useMemo(() => {
    return alerts.filter(
      (a) =>
        (a.accuracy2Entries >= 70 || a.isReinforced) &&
        a.tactical?.decision.veredicto !== "aguardar"
    );
  }, [alerts]);

  const temEntradaAltaAssertividade = isHighConfluence || highAssertiveAlerts.length > 0;

  return (
    <div className="space-y-2.5" data-panel-section="notificacao">
      {/* 0. GRADE TÁTICA BALÍSTICA FIXADA NO TOPO DAS NOTIFICAÇÕES (ROXO E BRANCO NEON VÍVIDO) */}
      <BallisticFavoritesGrid
        spins={spins}
        setores={setores}
        onSelectNumber={onSelectNumber}
      />

      {/* 1. MOTOR DE DECISÃO ANALÍTICA (DECISION ENGINE - 3 ESTADOS DINÂMICOS, SPARKLINES CHART.JS, CONFIDENCE BAR & SMART BUTTONS) */}
      <DecisionEngineAlertCard
        spins={spins ?? []}
        onSelectNumber={onSelectNumber}
        onOpenBankrollTab={() => onSelectTab?.("Gestão de Banca")}
      />

      {/* SE NÃO HOUVER ENTRADA DE ALTA ASSERTIVIDADE, RENDERIZA O MONITOR STANDBY */}
      {!temEntradaAltaAssertividade ? (
        <div
          className="flex min-h-[clamp(12rem,26svh,17rem)] min-w-0 shrink-0 flex-col justify-between overflow-y-auto rounded-2xl border-2 border-[#FF6D00]/70 bg-gradient-to-b from-[#220a02]/90 via-black/98 to-[#160501]/95 p-3.5 font-display shadow-[0_0_24px_rgba(255,109,0,0.3),inset_0_0_12px_rgba(255,109,0,0.1)] ring-1 ring-[#FF6D00]/40"
          data-panel-section="notificacao-standby"
        >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#FF6D00]/40 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-white text-stroke-black">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF6D00] shadow-[0_0_8px_#FF6D00] animate-pulse" />
            <span className="tracking-wider uppercase text-white drop-shadow-[0_0_6px_rgba(255,109,0,0.8)]">
              SISTEMA DE MONITORAMENTO AO VIVO
            </span>
          </div>
          <span className="rounded-full bg-black/90 px-2.5 py-0.5 font-mono text-[9.5px] font-bold text-[#FFA000] border border-[#FF6D00]/40 shadow-[0_0_8px_rgba(255,109,0,0.2)]">
            STANDBY · AGUARDANDO ALTA ASSERTIVIDADE
          </span>
        </div>

        <div className="my-2 rounded-xl border border-white/10 bg-black/60 p-2 font-mono text-[9px] text-white/70">
          <span className="text-[#00FF66] font-bold">🛡️ Filtro de Alta Assertividade Ativo:</span> O sistema silencia alertas de baixa convicção e apenas emite sinais quando a assertividade for superior a 70% (G1). No momento, o mercado está em fase de observação/calibração.
        </div>

        {ultimo ? (
          <div className="mt-2 flex h-full flex-col justify-between gap-2.5">
            <div className="grid grid-cols-2 gap-2">
              {/* Último Número */}
              <div className="flex flex-col items-center justify-center rounded-lg border border-neon-magenta/50 bg-background/60 p-2.5 shadow-[0_0_12px_rgba(255,0,255,0.15)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neon-magenta">
                  Último Giro
                </span>
                <div className="mt-1 flex items-center justify-center gap-3">
                  <span
                    className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-black ${
                      ultimo.num === 0
                        ? "num-green"
                        : ultimo.props.cor === "red"
                          ? "num-red"
                          : "num-black"
                    }`}
                  >
                    {ultimo.num}
                  </span>
                  {letraSetor && (
                    <span className="text-3xl font-black text-neon-gold drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]">
                      {letraSetor}
                    </span>
                  )}
                </div>
                <span className="mt-1 truncate text-[10px] font-bold text-neon-gold">
                  {ultimo.props.setor}
                </span>
              </div>

              {/* Número que puxa */}
              <div className="flex flex-col items-center justify-center rounded-lg border border-neon-cyan/50 bg-background/60 p-2.5 shadow-[0_0_12px_rgba(0,255,255,0.15)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neon-cyan">
                  Puxada Principal
                </span>
                {puxada && propsPuxada ? (
                  <>
                    <div className="mt-1 flex items-center justify-center gap-3">
                      <span
                        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-black ${
                          puxada.destino === 0
                            ? "num-green"
                            : propsPuxada.cor === "red"
                              ? "num-red"
                              : "num-black"
                        }`}
                      >
                        {puxada.destino}
                      </span>
                      {letraPuxada && (
                        <span className="text-3xl font-black text-neon-gold drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]">
                          {letraPuxada}
                        </span>
                      )}
                    </div>
                    <span className="mt-1 text-[10px] font-bold text-neon-cyan">
                      {puxada.qtd}x · {puxada.perc.toFixed(0)}%
                    </span>
                  </>
                ) : (
                  <span className="mt-3 text-[10px] text-muted-foreground">SEM HISTÓRICO</span>
                )}
              </div>
            </div>

            {/* Tendências Ativas */}
            {grupos && grupos.total > 0 && forteDuzia && forteColuna && tend && (
              <div className="rounded-md border border-border/50 bg-background/40 p-2 text-[10px] font-black leading-relaxed">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-neon-magenta">
                    DÚZIA {forteDuzia.idx}ª · {forteDuzia.perc.toFixed(1)}%
                  </span>
                  <span className="text-neon-cyan">
                    COLUNA {forteColuna.idx}ª · {forteColuna.perc.toFixed(1)}%
                  </span>
                  <span className="text-neon-gold">
                    {tend.paridade.nome} ({tend.paridade.perc.toFixed(0)}%) · {tend.maiorMenor.nome}
                  </span>
                  <span className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]">
                    COR {tend.cor.nome.toUpperCase()} ({tend.cor.perc.toFixed(0)}%)
                  </span>
                </div>
              </div>
            )}

            {zona && (
              <div className="truncate rounded border border-neon-gold/30 bg-neon-gold/5 px-2 py-1 text-[9px] font-bold text-neon-gold">
                ZONA DO CILINDRO: {zona.numeros.join(", ")} ({zona.qtd}x · {zona.perc.toFixed(0)}%)
              </div>
            )}
            {quentes && quentes.length > 0 && (
              <div className="truncate text-[9px] text-muted-foreground">
                🔥 QUENTES: {quentes.slice(0, 5).map((q) => `${q.num} (${q.qtd}x)`).join(" · ")}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
            Aguardando primeiros giros para inicializar os motores...
          </div>
        )}
      </div>
      ) : (
        <>
          {/* 1. MASTER BANNER: ENTRADA REFORÇADA (QUANDO MÚLTIPLOS PADRÕES CONVERGEM COM ALTA ASSERTIVIDADE) */}
      {isHighConfluence && confluence && confluence.hasConfluence && (
        <section
          className="relative overflow-hidden rounded-2xl border-2 border-[#FF6D00] bg-gradient-to-r from-[#2a0c02]/95 via-black/95 to-[#240801]/95 p-3.5 sm:p-4 text-white shadow-[0_0_30px_rgba(255,109,0,0.5),inset_0_0_15px_rgba(255,109,0,0.15)] animate-pulse"
          role="alert"
          aria-live="assertive"
        >
          {/* Efeitos de Luz Neon de Fundo */}
          <div className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-[#FF6D00]/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-[#FFA000]/20 blur-3xl" />

          {/* Top Bar do Banner Reforçado */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#FF6D00]/40 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FF6D00] text-black font-black shadow-[0_0_20px_#FF6D00]">
                <Flame className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h2 className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-white text-stroke-black flex items-center gap-1.5">
                  <span>{confluence.title}</span>
                </h2>
                <p className="text-[10px] sm:text-[11px] font-bold text-white/80 text-stroke-black-sm tracking-wide">
                  {confluence.description}
                </p>
              </div>
            </div>

            {/* Badge de Assertividade Combinada em 2 Entradas */}
            <div className="flex items-center gap-2 rounded-xl border-2 border-[#FF6D00] bg-black/90 px-3.5 py-1.5 shadow-[0_0_16px_rgba(255,109,0,0.45)]">
              <ShieldCheck className="h-5 w-5 text-[#FF6D00] drop-shadow-[0_0_6px_#FF6D00]" />
              <div className="text-right">
                <div className="text-[9px] uppercase font-bold text-white/70 tracking-wider">
                  ASSERTIVIDADE (2 ENTRADAS / G1)
                </div>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className="font-display text-xs sm:text-sm font-black text-[#FF6D00] drop-shadow-[0_0_8px_#FF6D00]">
                    {confluence.combinedAccuracy2Entries.toFixed(1)}% G1
                  </span>
                  <span className={`px-2 py-0.2 rounded font-mono text-[9px] font-black uppercase border shadow-sm ${
                    confluence.g1Result?.ultimo === "GREEN"
                      ? "bg-[#00E676]/25 text-[#00E676] border-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.5)]"
                      : confluence.g1Result?.ultimo === "RED"
                        ? "bg-red-500/25 text-red-300 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                        : "bg-white/10 text-white"
                  }`}>
                    ÚLTIMA: {confluence.g1Result?.ultimo === "GREEN" ? `🟢 GREEN (G${confluence.g1Result.entrada === 2 ? "1" : "0"})` : confluence.g1Result?.ultimo === "RED" ? "🔴 RED" : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Alvos Comuns e Padrões Integrados */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            {/* Números em Comum */}
            {confluence.commonNumbers.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase text-white tracking-wider text-stroke-black-sm">
                  Alvos Convergentes:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[...new Set(confluence.commonNumbers)].map((num, idx) => (
                    <button
                      key={`conf-num-${num}-${idx}`}
                      type="button"
                      onClick={() => onSelectNumber?.(num)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl font-display text-sm font-black text-white text-stroke-black shadow-lg ring-2 ring-[#FF6D00] transition-all hover:scale-115 cursor-pointer hover:shadow-[0_0_18px_#FF6D00]"
                      style={{
                        background: corDoNumero(num),
                        border: corDoNumero(num) === "#000000" ? "2px solid #FFFFFF" : corDoNumero(num) === "#FF003C" ? "2px solid #FF003C" : "2px solid #00FF88",
                        boxShadow: corDoNumero(num) === "#FF003C" ? "0 0 14px rgba(255,0,60,0.85)" : corDoNumero(num) === "#000000" ? "0 0 12px rgba(255,255,255,0.75)" : "0 0 14px rgba(0,255,136,0.85)",
                      }}
                      title={`Número ${num} com entrada reforçada`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Padrões Participantes */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-bold text-white/70 uppercase">Padrões:</span>
              {confluence.participatingPatterns.map((pat) => (
                <span
                  key={pat}
                  className="rounded-lg border border-[#FF6D00]/60 bg-[#FF6D00]/15 px-2.5 py-1 font-display text-[9px] font-black text-white shadow-[0_0_8px_rgba(255,109,0,0.25)] text-stroke-black-sm"
                >
                  {pat}
                </span>
              ))}
            </div>
          </div>

          {/* DIAGNÓSTICO TÁTICO DA ENTRADA REFORÇADA: FORTE PARA PAGAR vs AGUARDAR */}
          {confluence.tactical && (
            <div
              className={`mt-3 rounded-xl border-2 p-2.5 sm:p-3 transition-all ${
                confluence.tactical.decision.veredicto === "forte"
                  ? "border-[#00E676] bg-gradient-to-r from-emerald-950/90 via-black/95 to-emerald-950/90 shadow-[0_0_20px_rgba(0,230,118,0.4)] ring-1 ring-[#00E676]/60"
                  : confluence.tactical.decision.veredicto === "atencao"
                    ? "border-[#FACC15] bg-gradient-to-r from-amber-950/90 via-black/95 to-amber-950/90 shadow-[0_0_20px_rgba(250,204,21,0.35)] ring-1 ring-[#FACC15]/50"
                    : "border-red-500 bg-gradient-to-r from-red-950/90 via-black/95 to-red-950/90 shadow-[0_0_20px_rgba(239,68,68,0.35)] ring-1 ring-red-500/50"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                        confluence.tactical.decision.veredicto === "forte"
                          ? "bg-[#00E676]"
                          : confluence.tactical.decision.veredicto === "atencao"
                            ? "bg-[#FACC15]"
                            : "bg-red-500"
                      }`}
                    />
                    <span
                      className={`relative inline-flex h-3 w-3 rounded-full ${
                        confluence.tactical.decision.veredicto === "forte"
                          ? "bg-[#00E676]"
                          : confluence.tactical.decision.veredicto === "atencao"
                            ? "bg-[#FACC15]"
                            : "bg-red-500"
                      }`}
                    />
                  </span>
                  <span className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-white text-stroke-black">
                    {confluence.tactical.decision.badgeText}
                  </span>
                </div>
                <span className="rounded-full bg-black/90 px-2.5 py-0.5 font-mono text-[9px] font-bold text-white/80 border border-white/20">
                  DIAGNÓSTICO TÁTICO
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] sm:text-[11px]">
                <div className="text-white/90">
                  <strong className="text-white font-black">{confluence.tactical.decision.titulo}: </strong>
                  <span>{confluence.tactical.decision.motivo}</span>
                </div>
                <div className="shrink-0 rounded-lg bg-black/90 px-2.5 py-1 font-mono font-bold text-neon-gold border border-neon-gold/50 shadow-sm text-[10px]">
                  {confluence.tactical.decision.sugestaoAposta}
                </div>
              </div>
            </div>
          )}

          {/* PAINEL DE MÉTRICAS DETALHADAS DA ENTRADA REFORÇADA (NÍVEL HARD: 2 FILEIRAS DE 3 CARDS ESPAÇOSOS) */}
          <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 text-[10px]">
            {/* 1. DÚZIA */}
            <div className="rounded-xl border border-[#FF6D00]/50 bg-gradient-to-b from-[#FF6D00]/15 via-black/90 to-black/90 p-2.5 sm:p-3 shadow-[0_0_12px_rgba(255,109,0,0.15)] flex flex-col justify-between overflow-hidden min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[9px] sm:text-[10px] uppercase font-bold text-[#FFA000] tracking-wider truncate" title="Dúzia do Alvo">
                  Dúzia do Alvo
                </span>
                {confluence.tactical && (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.2 text-[8px] font-black uppercase border ${
                      confluence.tactical.bestDozen.isStrong
                        ? "bg-[#00E676]/25 text-[#00E676] border-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.4)]"
                        : "bg-[#FACC15]/25 text-[#FACC15] border-[#FACC15]"
                    }`}
                  >
                    {confluence.tactical.bestDozen.isStrong ? "FORTE P/ PAGAR" : "AGUARDAR"}
                  </span>
                )}
              </div>
              <div className="mt-1">
                <span className="font-display text-xs sm:text-sm font-black text-white text-stroke-black truncate block">
                  {confluence.dozensText}
                </span>
                {confluence.tactical && (
                  <span className="font-mono text-[9px] font-bold text-neon-gold block mt-0.5 truncate">
                    Melhor: <strong className="text-white">{confluence.tactical.bestDozen.name}</strong> ({confluence.tactical.bestDozen.targetPerc.toFixed(0)}% alvos)
                  </span>
                )}
              </div>
            </div>

            {/* 2. COLUNA */}
            <div className="rounded-xl border border-[#FF6D00]/50 bg-gradient-to-b from-[#FF6D00]/15 via-black/90 to-black/90 p-2.5 sm:p-3 shadow-[0_0_12px_rgba(255,109,0,0.15)] flex flex-col justify-between overflow-hidden min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[9px] sm:text-[10px] uppercase font-bold text-[#FFA000] tracking-wider truncate" title="Coluna do Alvo">
                  Coluna do Alvo
                </span>
                {confluence.tactical && (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.2 text-[8px] font-black uppercase border ${
                      confluence.tactical.bestColumn.isStrong
                        ? "bg-[#00E676]/25 text-[#00E676] border-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.4)]"
                        : "bg-[#FACC15]/25 text-[#FACC15] border-[#FACC15]"
                    }`}
                  >
                    {confluence.tactical.bestColumn.isStrong ? "FORTE P/ PAGAR" : "AGUARDAR"}
                  </span>
                )}
              </div>
              <div className="mt-1">
                <span className="font-display text-xs sm:text-sm font-black text-white text-stroke-black truncate block">
                  {confluence.columnsText}
                </span>
                {confluence.tactical && (
                  <span className="font-mono text-[9px] font-bold text-neon-gold block mt-0.5 truncate">
                    Melhor: <strong className="text-white">{confluence.tactical.bestColumn.name}</strong> ({confluence.tactical.bestColumn.targetPerc.toFixed(0)}% alvos)
                  </span>
                )}
              </div>
            </div>

            {/* 3. SETOR */}
            <div className="rounded-xl border border-[#FF6D00]/50 bg-gradient-to-b from-[#FF6D00]/15 via-black/90 to-black/90 p-2.5 sm:p-3 shadow-[0_0_12px_rgba(255,109,0,0.15)] flex flex-col justify-between overflow-hidden min-w-0">
              <span className="font-mono text-[9px] sm:text-[10px] uppercase font-bold text-[#FFA000] tracking-wider truncate" title="Setor Físico">
                Setor Físico
              </span>
              <span className="mt-1 font-display text-xs sm:text-sm font-black text-white text-stroke-black truncate" title={confluence.sectorsText}>
                {confluence.sectorsText}
              </span>
            </div>

            {/* 4. NÚMERO QUE ESTÁ PUXANDO */}
            <div className="rounded-xl border border-[#FF6D00]/50 bg-gradient-to-b from-[#FF6D00]/15 via-black/90 to-black/90 p-2.5 sm:p-3 shadow-[0_0_12px_rgba(255,109,0,0.15)] flex flex-col justify-between overflow-hidden min-w-0">
              <span className="font-mono text-[9px] sm:text-[10px] uppercase font-bold text-[#FFA000] tracking-wider truncate" title="Está Puxando">
                Está Puxando
              </span>
              <div className="mt-1 flex items-center gap-1.5 min-w-0">
                {confluence.pullingNumber !== null && (
                  <span
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white text-stroke-black shadow-md"
                    style={{
                      background: corDoNumero(confluence.pullingNumber),
                      border: corDoNumero(confluence.pullingNumber) === "#000000" ? "1.5px solid #FFFFFF" : corDoNumero(confluence.pullingNumber) === "#FF003C" ? "1.5px solid #FF003C" : "1.5px solid #00FF88",
                      boxShadow: corDoNumero(confluence.pullingNumber) === "#FF003C" ? "0 0 10px rgba(255,0,60,0.8)" : corDoNumero(confluence.pullingNumber) === "#000000" ? "0 0 8px rgba(255,255,255,0.7)" : "0 0 10px rgba(0,255,136,0.8)",
                    }}
                  >
                    {confluence.pullingNumber}
                  </span>
                )}
                <span className="font-display text-[11px] sm:text-xs font-black text-white text-stroke-black truncate" title={confluence.pullingSummary}>
                  {confluence.pullingDestino !== null ? `Puxa ${confluence.pullingDestino}` : confluence.pullingSummary}
                </span>
              </div>
            </div>

            {/* 5. MÁXIMA DO NÚMERO ATÉ O MOMENTO */}
            <div className="rounded-xl border border-[#FF6D00]/50 bg-gradient-to-b from-[#FF6D00]/15 via-black/90 to-black/90 p-2.5 sm:p-3 shadow-[0_0_12px_rgba(255,109,0,0.15)] flex flex-col justify-between overflow-hidden min-w-0">
              <span className="font-mono text-[9px] sm:text-[10px] uppercase font-bold text-[#FFA000] tracking-wider truncate" title="Máx. do Puxador">
                Máx. do Puxador
              </span>
              <div className="mt-1 flex items-baseline gap-1.5 truncate">
                <span className="font-display text-xs sm:text-sm font-black text-white text-stroke-black">
                  {confluence.pullingNumberMaxDelay !== null ? `${confluence.pullingNumberMaxDelay} giros` : "—"}
                </span>
                {confluence.pullingNumberQtd !== null && (
                  <span className="text-[9px] text-white/70 font-mono font-bold shrink-0">
                    ({confluence.pullingNumberQtd}x)
                  </span>
                )}
              </div>
            </div>

            {/* 6. % DO ALVO CONVERGENTE (DESTAQUE MÁXIMO) */}
            <div className="rounded-xl border-2 border-[#FF6D00] bg-gradient-to-b from-[#FF6D00]/25 via-black/95 to-black/95 p-2.5 sm:p-3 shadow-[0_0_18px_rgba(255,109,0,0.45)] ring-1 ring-[#FF6D00]/60 flex flex-col justify-between overflow-hidden min-w-0">
              <span className="font-mono text-[9px] sm:text-[10px] uppercase font-black text-[#FFA726] tracking-wider truncate" title="% Alvo Convergente">
                % Alvo Convergente
              </span>
              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-1.5 gap-y-0.5 min-w-0">
                <span className="font-display text-sm sm:text-base font-black text-[#FF6D00] drop-shadow-[0_0_10px_#FF6D00] leading-none shrink-0">
                  {confluence.targetAccuracy2Entries.toFixed(1)}%
                </span>
                <span className="font-mono text-[9px] sm:text-[10px] font-bold text-white/90 text-stroke-black-sm leading-tight truncate" title="Até 2 entradas / G1">
                  (Até 2 entradas / G1)
                </span>
              </div>
            </div>
          </div>

          {/* SINALIZAÇÃO DE CHANCES SIMPLES DOS ALVOS CONVERGENTES (COR, PAR OU ÍMPAR, MAIOR OU MENOR) */}
          {confluence.tactical && (
            <div className="mt-2.5 rounded-xl border border-[#FF6D00]/50 bg-gradient-to-r from-[#200801]/90 via-black/95 to-[#200801]/90 p-2.5 shadow-[0_0_14px_rgba(255,109,0,0.2)]">
              <div className="flex items-center justify-between border-b border-[#FF6D00]/25 pb-1.5 mb-2">
                <span className="font-display text-[9.5px] sm:text-[10.5px] font-black uppercase tracking-wider text-[#FFA000] text-stroke-black-sm flex items-center gap-1.5">
                  <Sparkles className="size-3 text-[#FFA000]" />
                  <span>CHANCES SIMPLES DOS ALVOS CONVERGENTES</span>
                </span>
                <span className="font-mono text-[9px] font-bold text-white/70">
                  DISTRIBUIÇÃO MATEMÁTICA
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                {/* 1. COR */}
                <div className="flex flex-col items-center justify-between rounded-lg bg-black/85 p-1.5 border border-white/10 hover:border-[#FF6D00]/40 transition-colors">
                  <span className="text-[8.5px] font-bold uppercase text-white/70">Cor Predominante</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full border border-white/40 shadow-sm"
                      style={{ background: confluence.tactical.chancesSimples.cor.corCode }}
                    />
                    <span className="font-display text-xs font-black text-white text-stroke-black-sm">
                      {confluence.tactical.chancesSimples.cor.predominante}
                    </span>
                    <span className="font-mono text-[9.5px] font-black text-neon-gold">
                      {confluence.tactical.chancesSimples.cor.perc.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* 2. PAR OU ÍMPAR */}
                <div className="flex flex-col items-center justify-between rounded-lg bg-black/85 p-1.5 border border-white/10 hover:border-[#FF6D00]/40 transition-colors">
                  <span className="text-[8.5px] font-bold uppercase text-white/70">Par ou Ímpar</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="font-display text-xs font-black text-white text-stroke-black-sm">
                      {confluence.tactical.chancesSimples.paridade.predominante}
                    </span>
                    <span className="font-mono text-[9.5px] font-black text-neon-cyan">
                      {confluence.tactical.chancesSimples.paridade.perc.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* 3. MAIOR OU MENOR */}
                <div className="flex flex-col items-center justify-between rounded-lg bg-black/85 p-1.5 border border-white/10 hover:border-[#FF6D00]/40 transition-colors">
                  <span className="text-[8.5px] font-bold uppercase text-white/70">Maior ou Menor</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="font-display text-xs font-black text-white text-stroke-black-sm">
                      {confluence.tactical.chancesSimples.magnitude.predominante}
                    </span>
                    <span className="font-mono text-[9.5px] font-black text-neon-magenta">
                      {confluence.tactical.chancesSimples.magnitude.perc.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DETALHAMENTO INDIVIDUAL DE CADA ALVO CONVERGENTE */}
          {confluence.targetStats.length > 0 && (
            <div className="mt-3 rounded-xl border border-[#FF6D00]/40 bg-black/70 p-2.5 shadow-[0_0_12px_rgba(255,109,0,0.15)]">
              <div className="flex items-center justify-between text-[9px] font-bold mb-2">
                <span className="uppercase text-[#FFA000] tracking-wider">Estatísticas dos Alvos no Momento:</span>
                <span className="text-white/60">Máx. Histórica & Saídas na Sessão</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
                {confluence.targetStats.map((t) => (
                  <div
                    key={t.num}
                    className="flex items-center justify-between gap-1.5 rounded-lg border border-[#FF6D00]/30 bg-black/80 px-2 py-1.5 text-[9px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white text-stroke-black shadow"
                        style={{
                          background: corDoNumero(t.num),
                          border: corDoNumero(t.num) === "#000000" ? "1px solid #FFFFFF" : corDoNumero(t.num) === "#FF003C" ? "1px solid #FF003C" : "1px solid #00FF88",
                          boxShadow: corDoNumero(t.num) === "#FF003C" ? "0 0 6px rgba(255,0,60,0.8)" : corDoNumero(t.num) === "#000000" ? "0 0 6px rgba(255,255,255,0.6)" : "0 0 6px rgba(0,255,136,0.8)",
                        }}
                      >
                        {t.num}
                      </span>
                      <span className="font-bold text-white">{t.perc.toFixed(1)}%</span>
                    </div>
                    <div className="text-right font-mono text-[8.5px] text-white/70">
                      <span>Máx: <strong className="text-[#FFA000]">{t.maiorEspera}g</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 2. CASO NÃO HAJA CONFLUÊNCIA MÚLTIPLA, MAS EXISTA ALERTA ÚNICO DE ALTA ASSERTIVIDADE (CARD FOCADO, SEM GRID RUÍDO) */}
      {!isHighConfluence && highAssertiveAlerts.length > 0 && (
        <div className="space-y-2.5">
          {highAssertiveAlerts.slice(0, 1).map((alert) => {
            const isReinforced = !!alert.isReinforced;

            return (
              <div
                key={alert.id}
                className={`relative overflow-hidden rounded-2xl border-2 p-3.5 font-display transition-all ${
                  isReinforced
                    ? "border-[#FF6D00] bg-gradient-to-b from-[#2a0c02]/95 via-black/98 to-[#1f0701]/95 shadow-[0_0_26px_rgba(255,109,0,0.5),inset_0_0_12px_rgba(255,109,0,0.15)] ring-1 ring-[#FF6D00]/60"
                    : "border-[#00FF66] bg-gradient-to-b from-[#021f11]/95 via-black/98 to-[#02140a]/95 shadow-[0_0_22px_rgba(0,255,102,0.4),inset_0_0_10px_rgba(0,255,102,0.1)] ring-1 ring-[#00FF66]/50"
                }`}
              >
                {/* Botão de Dispensar (se aplicável) */}
                {alert.isDismissable && alert.onDismiss && (
                  <button
                    onClick={alert.onDismiss}
                    className="absolute right-2.5 top-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-lg border border-white/20 bg-black/80 text-white/70 transition-colors hover:bg-destructive hover:text-white cursor-pointer"
                    title="Dispensar alerta"
                    aria-label="Dispensar"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}

                {/* Cabeçalho do Card */}
                <div className="flex items-center justify-between gap-1.5 border-b border-white/10 pb-2 pr-6">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full animate-pulse ${
                        isReinforced ? "bg-[#FF6D00] shadow-[0_0_8px_#FF6D00]" : "bg-[#00FF66] shadow-[0_0_8px_#00FF66]"
                      }`}
                    />
                    <span
                      className={`truncate text-xs sm:text-sm font-black uppercase tracking-wider ${
                        isReinforced
                          ? "text-[#FF6D00] drop-shadow-[0_0_8px_rgba(255,109,0,0.9)]"
                          : "text-[#00FF66] drop-shadow-[0_0_8px_rgba(0,255,102,0.8)]"
                      }`}
                    >
                      {alert.type} · OPORTUNIDADE DE ALTA ASSERTIVIDADE
                    </span>
                  </div>

                  {/* Badge de Entrada */}
                  <span className="shrink-0 rounded-lg bg-[#00FF66]/20 px-2 py-0.5 font-display text-[9px] font-black text-[#00FF66] border border-[#00FF66] shadow-[0_0_10px_rgba(0,255,102,0.4)]">
                    🎯 ALTA CONVICÇÃO
                  </span>
                </div>

                {/* Título do Alerta */}
                <div className="mt-2">
                  <h3 className="text-xs sm:text-sm font-bold text-white text-stroke-black-sm">
                    {alert.title}
                  </h3>
                </div>

                {/* Números Alvos em Chips Coloridos */}
                {alert.targetNumbers.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-[9.5px] uppercase font-bold text-white/80">Alvos Recomendados:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[...new Set(alert.targetNumbers)].slice(0, 12).map((num, idx) => (
                        <button
                          key={`${alert.id}-target-${num}-${idx}`}
                          type="button"
                          onClick={() => onSelectNumber?.(num)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg font-display text-xs font-black text-white text-stroke-black shadow transition-transform hover:scale-115 cursor-pointer ring-1 ring-white/30"
                          style={{
                            background: corDoNumero(num),
                            border: corDoNumero(num) === "#000000" ? "1.5px solid #FFFFFF" : isReinforced ? "1.5px solid #FF6D00" : corDoNumero(num) === "#FF003C" ? "1.5px solid #FF003C" : "1.5px solid #00FF88",
                            boxShadow: corDoNumero(num) === "#FF003C" ? "0 0 8px rgba(255,0,60,0.8)" : corDoNumero(num) === "#000000" ? "0 0 8px rgba(255,255,255,0.7)" : "0 0 8px rgba(0,255,136,0.6)",
                          }}
                          title={`Número ${num}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* BARRA DE ASSERTIVIDADE (ATÉ 2 ENTRADAS / G1) */}
                <div className="mt-2.5 rounded-xl border border-[#00FF66]/50 bg-black/80 p-2.5 shadow-[0_0_12px_rgba(0,255,102,0.2)]">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="flex items-center gap-1.5 font-bold text-white">
                      <ShieldCheck className="h-4 w-4 text-[#00FF66] drop-shadow-[0_0_6px_#00FF66]" />
                      <span>Assertividade Comprovada (até 2 entradas / G1):</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-black text-sm text-[#00FF66] drop-shadow-[0_0_8px_#00FF66]">
                        {alert.accuracyLabel}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[8.5px] font-black uppercase border shadow-sm ${
                        alert.g1Result?.ultimo === "GREEN"
                          ? "bg-[#00E676]/25 text-[#00E676] border-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.4)]"
                          : alert.g1Result?.ultimo === "RED"
                            ? "bg-red-500/25 text-red-300 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                            : "bg-white/10 text-white/70 border-white/20"
                      }`}>
                        ÚLTIMA: {alert.g1Result?.ultimo === "GREEN" ? `🟢 GREEN (G${alert.g1Result.entrada === 2 ? "1" : "0"})` : alert.g1Result?.ultimo === "RED" ? "🔴 RED" : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SINALIZAÇÃO TÁTICA DO ALERTA */}
                {alert.tactical && (
                  <div className="mt-2.5 rounded-xl border border-white/10 bg-black/85 p-2.5 space-y-2 text-[9.5px]">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="font-mono text-[8.5px] font-black uppercase px-2 py-0.5 rounded border bg-[#00E676]/20 text-[#00E676] border-[#00E676]">
                        {alert.tactical.decision.badgeText}
                      </span>
                      <span className="text-[9px] text-white/80 font-mono font-bold">
                        {alert.tactical.decision.sugestaoAposta}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                      <div className="rounded-lg bg-black/90 p-1.5 border border-white/10 flex items-center justify-between">
                        <span className="text-white/70">Dúzia Recomendada:</span>
                        <strong className="text-neon-gold">{alert.tactical.bestDozen.name} ({alert.tactical.bestDozen.targetPerc.toFixed(0)}%)</strong>
                      </div>
                      <div className="rounded-lg bg-black/90 p-1.5 border border-white/10 flex items-center justify-between">
                        <span className="text-white/70">Coluna Recomendada:</span>
                        <strong className="text-neon-gold">{alert.tactical.bestColumn.name} ({alert.tactical.bestColumn.targetPerc.toFixed(0)}%)</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Entrada Sugerida e Botão de Ação */}
                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/10 pt-2 text-[10px]">
                  {alert.suggestedStake !== undefined && alert.suggestedStake > 0 ? (
                    <span className="font-bold text-[#FFA000]">
                      Entrada Sugerida:{" "}
                      <strong className="text-white text-stroke-black-sm">
                        {alert.suggestedStake.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-[9.5px] text-white/70">Entrada padrão 1x</span>
                  )}

                  {alert.actionTab && onSelectTab && (
                    <button
                      onClick={() => onSelectTab(alert.actionTab!)}
                      className="flex items-center gap-1 rounded-lg bg-[#00FF66] px-3 py-1.5 text-[9.5px] font-black text-black transition-all hover:bg-emerald-400 hover:shadow-[0_0_12px_#00FF66] cursor-pointer"
                    >
                      <span>Ver Análise</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  )}
</div>
);
}
