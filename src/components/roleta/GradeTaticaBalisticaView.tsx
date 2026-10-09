import React, { useMemo, useState } from "react";
import {
  Compass,
  Activity,
  ShieldCheck,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Sparkles,
  Target,
  BarChart3,
  RotateCcw,
  Zap,
  TrendingDown,
  TrendingUp,
  Eye,
  EyeOff,
} from "lucide-react";
import type { Spin, SectorDef } from "@/lib/roulette";
import { REDS, SETORES_PADRAO } from "@/lib/roulette";
import {
  type TrackedPattern,
  calculateConfluenceFromPatterns,
  JANELA_DESLIZANTE_MAX,
  MIN_RODADAS_QUALIFICACAO,
} from "@/lib/pattern-tracker-engine";
import { calculateBallisticFavorites } from "@/lib/ballistic-favorites";
import { ConfluenceMainCard } from "./ConfluenceMainCard";

interface GradeTaticaBalisticaViewProps {
  patterns: TrackedPattern[];
  spins: Spin[];
  setores?: SectorDef[] | undefined;
  pressaoMinima?: number | undefined;
  onSelectNumber?: ((num: number) => void) | undefined;
  onUndo?: (() => void) | undefined;
  onClearAll?: (() => void) | undefined;
}

export function GradeTaticaBalisticaView({
  patterns,
  spins,
  setores = SETORES_PADRAO,
  pressaoMinima = 75,
  onSelectNumber,
  onUndo,
  onClearAll,
}: GradeTaticaBalisticaViewProps) {
  const ballistic = useMemo(() => {
    return calculateBallisticFavorites(spins, setores);
  }, [spins, setores]);

  const confluence = useMemo(() => {
    return calculateConfluenceFromPatterns(patterns, spins, { pressaoMinima });
  }, [patterns, spins, pressaoMinima]);

  const ultimoGiro = spins[0] ?? null;

  const [mostrarGridMonitoramento, setMostrarGridMonitoramento] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("roleta_mostrar_grid_monitoramento_padroes");
      return saved === "true"; // Padrão: false (desativado por padrão)
    } catch {
      return false;
    }
  });

  const toggleGridMonitoramento = () => {
    setMostrarGridMonitoramento((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("roleta_mostrar_grid_monitoramento_padroes", String(next));
      } catch {}
      return next;
    });
  };

  const [mostrarCilindroSelecao, setMostrarCilindroSelecao] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("roleta_mostrar_cilindro_selecao");
      return saved === "true"; // Padrão: false (desativado por padrão)
    } catch {
      return false;
    }
  });

  const toggleCilindroSelecao = () => {
    setMostrarCilindroSelecao((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("roleta_mostrar_cilindro_selecao", String(next));
      } catch {}
      return next;
    });
  };

  const [mostrarGridMonitorandoJanela30, setMostrarGridMonitorandoJanela30] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("roleta_mostrar_grid_monitorando_janela30");
      return saved === "true"; // Padrão: false (inativo e oculto por padrão)
    } catch {
      return false;
    }
  });

  const toggleGridMonitorandoJanela30 = () => {
    setMostrarGridMonitorandoJanela30((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("roleta_mostrar_grid_monitorando_janela30", String(next));
      } catch {}
      return next;
    });
  };

  // Se houver Entrada Nível Expert confirmada (alta assertividade), exibe o alerta.
  // Se estiver apenas em monitoramento/standby ("MONITORANDO PADRÕES (JANELA 30)"), fica inativo e oculto por padrão.
  const deveExibirGridConfluencia = confluence.isEntradaExpert || mostrarGridMonitorandoJanela30;

  return (
    <div className="flex flex-col gap-3 font-display">
      {/* =========================================================================
          HEADER DA GRADE TÁTICA BALÍSTICA (NEON ROXO / CIANO / VERDE TÁTICO)
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-500/50 bg-gradient-to-r from-[#040d21]/95 via-[#020714]/98 to-[#07132e]/95 p-3 sm:p-4 text-white shadow-[0_0_24px_rgba(0,229,255,0.25)] ring-1 ring-cyan-400/30">
        <div className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/30 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-black font-black shadow-[0_0_18px_rgba(0,229,255,0.8)]">
              <Compass className="h-5 w-5 text-black animate-spin" style={{ animationDuration: "14s" }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]">
                  GRADE TÁTICA BALÍSTICA
                </h1>
                <span className="inline-flex items-center gap-1 rounded-md border border-[#00FF88]/60 bg-emerald-950/60 px-2 py-0.5 font-mono text-[10px] font-bold text-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.3)]">
                  <Activity className="h-3 w-3 text-[#00FF88]" />
                  JANELA DESLIZANTE ({JANELA_DESLIZANTE_MAX})
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Modelagem preditiva: Janela de 30 giros, Score de Confiança (0-100) e Confluência Ponderada 2.0x.
              </p>
            </div>
          </div>

          {/* TELEMETRIA RÁPIDA DE GIROS */}
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-cyan-500/40 bg-black/80 px-3 py-1.5 text-right shadow-[0_0_10px_rgba(0,229,255,0.2)]">
              <div className="text-[9px] uppercase font-bold text-cyan-400/80">TOTAL DE GIROS</div>
              <div className="font-mono text-sm font-black text-white">{spins.length}</div>
            </div>

            {ultimoGiro && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-black/85 px-3 py-1.5 shadow-[0_0_12px_rgba(0,255,136,0.3)]">
                <div className="text-left">
                  <div className="text-[9px] uppercase font-bold text-emerald-400">ÚLTIMO NÚMERO</div>
                  <div className="text-[10px] font-semibold text-slate-300">
                    {ultimoGiro.props.duzia}ª Dz · {ultimoGiro.props.coluna}ª Col
                  </div>
                </div>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-black shadow-md ${
                    ultimoGiro.num === 0
                      ? "bg-[#00E676] text-white border-2 border-[#00FF88] shadow-[0_0_16px_#00FF88]"
                      : ultimoGiro.props.cor === "red"
                      ? "bg-[#FF003C] text-white border-2 border-[#FF003C] shadow-[0_0_16px_rgba(255,0,60,0.85)]"
                      : "bg-[#000000] text-white border-2 border-white shadow-[0_0_14px_rgba(255,255,255,0.75)]"
                  }`}
                >
                  {ultimoGiro.num}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* SUB-TELEMETRIA: ÂNGULO, DELTA E PROJEÇÃO */}
        <div className="relative z-10 mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
          <div className="rounded-lg border border-cyan-500/20 bg-black/50 p-1.5">
            <span className="text-slate-400 block text-[9px]">ÂNGULO CILINDRO</span>
            <span className="font-mono font-bold text-cyan-300">{ballistic.anguloUltimo.toFixed(1)}°</span>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-black/50 p-1.5">
            <span className="text-slate-400 block text-[9px]">DELTA MÉDIO (Δ)</span>
            <span className="font-mono font-bold text-cyan-300">{ballistic.deltaMedioCasas} casas</span>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-black/50 p-1.5">
            <span className="text-slate-400 block text-[9px]">TENDÊNCIA ATUAL</span>
            <span className="font-mono font-bold text-emerald-400 uppercase">{ballistic.tendenciaPrimaria}</span>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-black/50 p-1.5">
            <span className="text-slate-400 block text-[9px]">ASSERTIVIDADE G1</span>
            <span className="font-mono font-bold text-purple-300">{ballistic.assertividadeG1.toFixed(1)}% G1</span>
          </div>
        </div>
      </div>

      {/* NOTIFICAÇÃO PRINCIPAL & CONFLUÊNCIA DE DÚZIA E COLUNA (INATIVO & OCULTO SE APENAS MONITORANDO) */}
      {deveExibirGridConfluencia && (
        <ConfluenceMainCard
          confluence={confluence}
          onSelectNumber={onSelectNumber}
          onClose={() => {
            setMostrarGridMonitorandoJanela30(false);
            try {
              localStorage.setItem("roleta_mostrar_grid_monitorando_janela30", "false");
            } catch {}
          }}
        />
      )}

      {/* =========================================================================
          SEÇÃO 1: RASTREAMENTO DE PADRÕES E SCORE DE CONFIANÇA
          - Janela Deslizante de 30 rodadas
          - Score de Confiança de 0 a 100
          - Total Greens, Total Reds, Último Resultado
          ========================================================================= */}
      {/* =========================================================================
          SEÇÃO 1: RASTREAMENTO DE PADRÕES E SCORE DE CONFIANÇA (OCULTO SE DESATIVADO)
          - Janela Deslizante de 30 rodadas
          - Score de Confiança de 0 a 100
          - Total Greens, Total Reds, Último Resultado
          ========================================================================= */}
      {mostrarGridMonitoramento && (
        <div className="rounded-2xl border-2 border-slate-700/60 bg-gradient-to-b from-[#081022]/95 via-[#030713]/98 to-[#081022]/95 p-3 sm:p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/50 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                MONITORAMENTO DE PADRÕES (JANELA DE {JANELA_DESLIZANTE_MAX} GIROS)
              </h2>
              <span className="rounded-full bg-cyan-950 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-400 border border-cyan-500/40">
                {patterns.length} Padrões
              </span>
              <span className="rounded-full px-2 py-0.5 font-mono text-[9px] font-black uppercase border border-emerald-500/60 bg-emerald-950/60 text-[#00FF88]">
                ATIVO
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                Qualificação: Mín {MIN_RODADAS_QUALIFICACAO} rodadas · Válido: Score &gt; 80
              </span>
              <button
                type="button"
                onClick={toggleGridMonitoramento}
                aria-label="Ocultar Grid de Monitoramento"
                className="flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/60 px-2.5 py-1 text-[10px] font-mono font-bold uppercase text-cyan-300 hover:bg-cyan-900/60 transition cursor-pointer"
              >
                <EyeOff className="h-3.5 w-3.5 text-cyan-400" />
                <span>Ocultar Grid</span>
              </button>
            </div>
          </div>

          {/* LISTA / GRID DE PADRÕES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {patterns.map((p) => {
              const isValido = p.isValido;
              const isQuebra = p.isQuebraPadrao;
              const isAguardando = p.statusValidacao === "AGUARDANDO_AMOSTRA";

              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 transition-all ${
                    isValido
                      ? "border-emerald-500/80 bg-gradient-to-br from-[#022413]/90 via-[#01140a]/95 to-black/95 shadow-[0_0_18px_rgba(0,255,136,0.25)] ring-1 ring-emerald-400/50"
                      : isQuebra
                      ? "border-rose-600/70 bg-gradient-to-br from-[#240308]/90 via-[#140104]/95 to-black/95 shadow-[0_0_14px_rgba(255,42,85,0.25)]"
                      : isAguardando
                      ? "border-slate-700/80 bg-[#070d1d]/90 hover:border-cyan-500/50"
                      : "border-slate-800 bg-[#0a0a14]/90"
                  }`}
                >
                  {/* Linha superior: Código, Nome e Badge do Score */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-black shadow-sm ${
                          isValido
                            ? "bg-emerald-500 text-black shadow-[0_0_10px_#00FF88]"
                            : isQuebra
                            ? "bg-rose-600 text-white shadow-[0_0_8px_#FF2A55]"
                            : "bg-cyan-900/80 text-cyan-300 border border-cyan-500/40"
                        }`}
                      >
                        {p.code}
                      </span>
                      <div>
                        <div className="text-xs font-black text-white flex items-center gap-1.5">
                          {p.nome}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[180px] sm:max-w-[220px]">
                          {p.regraDescricao}
                        </div>
                      </div>
                    </div>

                    {/* Badge de Score de Confiança */}
                    <div>
                      {isValido ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400 bg-emerald-950/80 px-2 py-0.5 font-mono text-[9px] font-black uppercase text-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.4)] animate-pulse">
                          <Sparkles className="h-3 w-3 text-emerald-400" />
                          SCORE {p.scoreConfianca} (VÁLIDO &gt;80)
                        </span>
                      ) : isQuebra ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-rose-500 bg-rose-950/90 px-2 py-0.5 font-mono text-[9px] font-black uppercase text-rose-300 shadow-[0_0_8px_rgba(255,42,85,0.4)]">
                          <TrendingDown className="h-3 w-3 text-rose-400" />
                          QUEBRA (2 REDS · {p.scoreConfianca})
                        </span>
                      ) : isAguardando ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-950/60 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-300">
                          <Clock className="h-3 w-3 text-amber-400" />
                          {p.totalRounds}/{MIN_RODADAS_QUALIFICACAO} RODADAS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-900 px-2 py-0.5 font-mono text-[9px] font-bold text-slate-300">
                          SCORE {p.scoreConfianca} (≤80)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score Bar com indicador de corte em 80 */}
                  <div className="mt-2.5">
                    <div className="flex justify-between text-[9px] font-mono mb-1">
                      <span className="text-slate-400">Score de Confiança:</span>
                      <span className={isValido ? "text-[#00FF88] font-black" : isQuebra ? "text-rose-400 font-bold" : "text-cyan-300"}>
                        {p.scoreConfianca} / 100 {p.taxaGreens > 65 && p.ultimoResultado === "GREEN" && "⚡ Tendência"}
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-white/10 p-[1px]">
                      {/* Linha guia de corte em 80% */}
                      <div className="absolute top-0 bottom-0 left-[80%] w-[2px] bg-emerald-500/80 z-10" title="Linha de corte: Score 80" />
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isValido
                            ? "bg-gradient-to-r from-cyan-400 to-[#00FF88] shadow-[0_0_8px_#00FF88]"
                            : isQuebra
                            ? "bg-gradient-to-r from-rose-800 to-rose-500"
                            : "bg-slate-600"
                        }`}
                        style={{ width: `${Math.max(4, p.scoreConfianca)}%` }}
                      />
                    </div>
                  </div>

                  {/* ALVOS DO PADRÃO & ZONAS */}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-300 bg-black/40 rounded-md p-1.5 border border-white/5">
                    <div className="truncate max-w-[200px]">
                      <span className="text-cyan-400 font-bold uppercase text-[9px] mr-1">Alvos:</span>
                      <span className="font-mono text-emerald-300">{p.alvosText}</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">
                      Aponta:{" "}
                      <span className="text-white font-bold">
                        {p.alvoDuziasDominantes.map((d) => `${d}ª Dz`).join(", ")} · {p.alvoColunasDominantes.map((c) => `${c}ª Col`).join(", ")}
                      </span>
                    </div>
                  </div>

                  {/* EXIGÊNCIA DO PROMPT (ITEM 1): GREENS, REDS, ÚLTIMO RESULTADO */}
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-2.5">
                    {/* a) Total de Greens */}
                    <div className="flex flex-col items-center justify-center rounded-lg border border-emerald-500/50 bg-emerald-950/40 p-1.5 shadow-[0_0_10px_rgba(0,255,136,0.15)]">
                      <span className="text-[9px] font-black uppercase text-emerald-400">GREENS</span>
                      <span className="font-mono text-base font-black text-[#00FF88] drop-shadow-[0_0_8px_#00FF88]">
                        {p.totalGreens}
                      </span>
                      <span className="text-[8px] text-emerald-300/80 font-mono">
                        {p.totalRounds > 0 ? `${p.taxaGreens.toFixed(0)}% (${p.totalRounds}/${JANELA_DESLIZANTE_MAX})` : "0%"}
                      </span>
                    </div>

                    {/* b) Total de Reds */}
                    <div className="flex flex-col items-center justify-center rounded-lg border border-rose-500/50 bg-rose-950/40 p-1.5 shadow-[0_0_10px_rgba(255,42,85,0.15)]">
                      <span className="text-[9px] font-black uppercase text-rose-400">REDS</span>
                      <span className="font-mono text-base font-black text-[#FF2A55] drop-shadow-[0_0_8px_#FF2A55]">
                        {p.totalReds}
                      </span>
                      <span className="text-[8px] text-rose-300/80 font-mono">
                        {p.totalRounds > 0 ? `${(100 - p.taxaGreens).toFixed(0)}%` : "0%"}
                      </span>
                    </div>

                    {/* c) Badge visual do Último Resultado */}
                    <div className="flex flex-col items-center justify-center rounded-lg border border-slate-700 bg-black/60 p-1.5 text-center">
                      <span className="text-[9px] font-black uppercase text-slate-400">ÚLTIMO</span>
                      {p.ultimoResultado === "GREEN" ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-emerald-500/30 border border-emerald-400 px-1.5 py-0.5 font-mono text-[9px] font-black text-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.5)]">
                          <CheckCircle2 className="h-3 w-3 text-[#00FF88]" />
                          <span>Green</span>
                        </span>
                      ) : p.ultimoResultado === "RED" ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-rose-500/30 border border-rose-400 px-1.5 py-0.5 font-mono text-[9px] font-black text-[#FF2A55] shadow-[0_0_8px_rgba(255,42,85,0.5)]">
                          <XCircle className="h-3 w-3 text-[#FF2A55]" />
                          <span>Red</span>
                        </span>
                      ) : (
                        <span className="mt-0.5 text-[9px] text-slate-500 font-mono">
                          Aguardando
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Histórico recente de bolinhas */}
                  <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                    <span>Sequência:</span>
                    <div className="flex gap-1">
                      {p.historico.map((res, hIdx) => (
                        <span
                          key={`h-${p.id}-${hIdx}`}
                          className={`h-2 w-2 rounded-full ${
                            res === "GREEN"
                              ? "bg-[#00FF88] shadow-[0_0_4px_#00FF88]"
                              : "bg-[#FF2A55] shadow-[0_0_4px_#FF2A55]"
                          }`}
                          title={res}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          SEÇÃO 2: ROUPA TÁTICA DA ROLETA & KEYPAD INTERATIVO DE ENTRADA (OCULTO SE DESATIVADO)
          ========================================================================= */}
      {mostrarCilindroSelecao && (
        <div className="rounded-2xl border border-cyan-500/30 bg-[#050a17]/95 p-3 sm:p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs sm:text-sm font-black uppercase text-white">
                CILINDRO BALÍSTICO &amp; SELEÇÃO DE GIROS
              </h3>
              <span className="rounded-full px-2 py-0.5 font-mono text-[9px] font-black uppercase border border-emerald-500/60 bg-emerald-950/60 text-[#00FF88]">
                ATIVO
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleCilindroSelecao}
                aria-label="Ocultar Cilindro Balístico"
                className="flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/60 px-2.5 py-1 text-[10px] font-mono font-bold uppercase text-cyan-300 hover:bg-cyan-900/60 transition cursor-pointer"
              >
                <EyeOff className="h-3.5 w-3.5 text-cyan-400" />
                <span>Ocultar Cilindro</span>
              </button>
              {onUndo && (
                <button
                  onClick={onUndo}
                  className="flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-black/60 px-2 py-1 text-[10px] font-bold text-cyan-300 hover:bg-cyan-950/80 cursor-pointer"
                  title="Desfazer último número"
                >
                  <RotateCcw className="h-3 w-3" />
                  Desfazer
                </button>
              )}
              {onClearAll && (
                <button
                  onClick={onClearAll}
                  className="rounded-lg border border-rose-500/40 bg-black/60 px-2 py-1 text-[10px] font-bold text-rose-300 hover:bg-rose-950/80 cursor-pointer"
                  title="Limpar todos os giros"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* NÚMEROS FAVORITOS BALÍSTICOS (TOP 8) */}
          <div className="mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
              <span>8 NÚMEROS PROJETADOS PELO CILINDRO</span>
              <span className="text-purple-300 font-mono">{ballistic.tendenciaPrimaria}</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {ballistic.numbers.slice(0, 8).map((item, idx) => {
                const num = item.num;
                const isRed = item.cor === "red";
                return (
                  <button
                    key={`fav-${num}-${idx}`}
                    onClick={() => onSelectNumber?.(num)}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 p-2 transition-all hover:scale-105 cursor-pointer ${
                      num === 0
                        ? "border-[#00FF88] bg-[#00E676] text-white shadow-[0_0_16px_rgba(0,255,136,0.85)]"
                        : isRed
                        ? "border-[#FF003C] bg-[#FF003C] text-white shadow-[0_0_16px_rgba(255,0,60,0.85),inset_0_0_6px_rgba(255,255,255,0.3)] hover:brightness-115"
                        : "border-white bg-[#000000] text-white shadow-[0_0_14px_rgba(255,255,255,0.75),inset_0_0_6px_rgba(255,255,255,0.2)] hover:border-[#08f7fe]"
                    }`}
                  >
                    <span className="text-[9px] font-mono font-bold text-slate-300">#{idx + 1}</span>
                    <span className="font-mono text-lg font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                      {num}
                    </span>
                    <span className="text-[8px] font-mono font-semibold text-slate-300 truncate max-w-full">
                      {item.setor}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TECLADO COMPACTO 0-36 PARA INSERÇÃO RÁPIDA */}
          {onSelectNumber && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                INSERIR NÚMERO AO VIVO (0 a 36)
              </div>
              <div className="flex flex-col gap-1">
                {/* Botão Zero */}
                <button
                  onClick={() => onSelectNumber(0)}
                  className="w-full rounded-lg border-2 border-[#00FF88] bg-[#00E676] py-1.5 font-mono text-xs font-black text-white hover:brightness-110 cursor-pointer shadow-[0_0_16px_rgba(0,255,136,0.6)]"
                >
                  0 VERDE
                </button>

                {/* Grid 1 a 36 em 12 colunas ou 3 linhas */}
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                  {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => {
                    const isRed = REDS.includes(n);
                    return (
                      <button
                        key={`btn-pad-${n}`}
                        onClick={() => onSelectNumber(n)}
                        className={`rounded-lg py-2 font-mono text-xs font-black transition-all hover:scale-105 cursor-pointer text-white ${
                          isRed
                            ? "border-2 border-[#FF003C] bg-[#FF003C] hover:brightness-115 shadow-[0_0_10px_rgba(255,0,60,0.8)]"
                            : "border-2 border-white bg-[#000000] hover:border-[#08f7fe] shadow-[0_0_10px_rgba(255,255,255,0.7)]"
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BARRA DISCRETA PARA EXIBIR SEÇÕES OCULTAS (CASO DESEJADO) */}
      {(!mostrarGridMonitorandoJanela30 || !mostrarGridMonitoramento || !mostrarCilindroSelecao) && (
        <div className="flex flex-wrap items-center justify-end gap-2 py-1 text-[10px] font-mono text-slate-400">
          {!mostrarGridMonitorandoJanela30 && !confluence.isEntradaExpert && (
            <button
              type="button"
              onClick={toggleGridMonitorandoJanela30}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-900/80 px-2.5 py-1 text-[10px] font-mono font-semibold text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 transition cursor-pointer"
              title="Exibir Grid Monitorando Padrões (Janela 30)"
            >
              <Eye className="h-3 w-3 text-cyan-400" />
              <span>Exibir Monitorando Padrões (Janela 30)</span>
            </button>
          )}
          {!mostrarGridMonitoramento && (
            <button
              type="button"
              onClick={toggleGridMonitoramento}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-900/80 px-2.5 py-1 text-[10px] font-mono font-semibold text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 transition cursor-pointer"
              title="Exibir Lista Completa de Padrões"
            >
              <Eye className="h-3 w-3 text-cyan-400" />
              <span>Exibir Lista de Padrões</span>
            </button>
          )}
          {!mostrarCilindroSelecao && (
            <button
              type="button"
              onClick={toggleCilindroSelecao}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-900/80 px-2.5 py-1 text-[10px] font-mono font-semibold text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 transition cursor-pointer"
              title="Exibir Cilindro Balístico & Seleção de Giros"
            >
              <Eye className="h-3 w-3 text-cyan-400" />
              <span>Exibir Cilindro Balístico</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
