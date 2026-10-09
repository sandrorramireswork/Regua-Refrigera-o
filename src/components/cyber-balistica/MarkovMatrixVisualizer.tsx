import React, { useState } from "react";
import {
  GitCommit,
  TrendingUp,
  Target,
  Sparkles,
  Info,
  Maximize2,
  Layers,
} from "lucide-react";
import {
  MARKOV_STATES,
  MARKOV_STATE_INFO,
  type MultidimensionalMarkovResult,
  type MarkovCombinedState,
} from "@/lib/quantitative-terminal-engine";

interface MarkovMatrixVisualizerProps {
  markovResult: MultidimensionalMarkovResult;
  onSelectNumber?: ((num: number) => void) | undefined;
}

export function MarkovMatrixVisualizer({
  markovResult,
  onSelectNumber,
}: MarkovMatrixVisualizerProps) {
  const {
    currentState,
    previousState,
    totalTransitions,
    matrix,
    predictionsFromCurrent,
    topPrediction,
  } = markovResult;

  const [viewMode, setViewMode] = useState<"prob" | "count" | "delta">("prob");
  const [selectedInspectState, setSelectedInspectState] = useState<MarkovCombinedState | null>(null);

  const inspectedState = selectedInspectState ?? currentState ?? "RED_VOISINS";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b0e14] p-4 sm:p-5 font-mono shadow-xl relative overflow-hidden">
      {/* HEADER: TÍTULO & CONTROLES */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/15 text-indigo-400">
            <GitCommit className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm sm:text-base font-black uppercase tracking-wider text-white whitespace-nowrap">
                MATRIZ DE MARKOV MULTIDIMENSIONAL
              </span>
              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-500/40 px-2 py-0.5 rounded whitespace-nowrap">
                COR + SETOR DO CILINDRO
              </span>
            </div>
            <p className="text-xs text-[#8892b0] mt-0.5">
              Cadeia de transição estocástica: P(Cor + Setor | Estado Anterior).
            </p>
          </div>
        </div>

        {/* SELETOR DE MODO DE EXIBIÇÃO (% vs Contagem vs Delta) */}
        <div className="flex items-center gap-1 rounded-xl bg-black/60 p-1 border border-white/10 shrink-0 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("prob")}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              viewMode === "prob"
                ? "bg-indigo-600 text-white shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                : "text-[#8892b0] hover:text-white"
            }`}
          >
            Probabilidade (%)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("delta")}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              viewMode === "delta"
                ? "bg-indigo-600 text-white shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                : "text-[#8892b0] hover:text-white"
            }`}
          >
            Divergência (ΔP)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("count")}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              viewMode === "count"
                ? "bg-indigo-600 text-white shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                : "text-[#8892b0] hover:text-white"
            }`}
          >
            Contagem (Qtd)
          </button>
        </div>
      </div>

      {/* CARDS SUPERIORES: ESTADO ATUAL & PREVISÃO DE ALTA PROBABILIDADE (GRID 2 COLUNAS ROBUSTO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* CARD 1: ESTADO ATUAL OBSERVADO */}
        <div className="rounded-xl border border-white/15 bg-black/40 p-3.5 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
            <span className="text-xs font-bold uppercase text-[#8892b0] flex items-center gap-1.5 whitespace-nowrap">
              <Layers className="h-3.5 w-3.5 text-[#08f7fe]" />
              ESTADO OBSERVADO ATUAL
            </span>
            <span className="text-[10px] text-[#8892b0] bg-white/5 px-2 py-0.5 rounded border border-white/10 whitespace-nowrap">
              {totalTransitions} transições registradas
            </span>
          </div>

          {currentState ? (
            <div className="flex items-center justify-between gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="min-w-0 flex-1">
                <span
                  className="text-sm sm:text-base font-black tracking-wide block truncate"
                  style={{ color: MARKOV_STATE_INFO[currentState].textColor }}
                >
                  {MARKOV_STATE_INFO[currentState].label}
                </span>
                <span className="text-[11px] text-[#8892b0] block mt-0.5">
                  {MARKOV_STATE_INFO[currentState].numbers.length} números no setor · Base teórica:{" "}
                  {(MARKOV_STATE_INFO[currentState].theoreticalProbability * 100).toFixed(1)}%
                </span>
              </div>

              <span
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-black border whitespace-nowrap shrink-0 shadow-sm"
                style={{
                  backgroundColor: `${MARKOV_STATE_INFO[currentState].color}25`,
                  color: MARKOV_STATE_INFO[currentState].textColor,
                  borderColor: `${MARKOV_STATE_INFO[currentState].color}70`,
                }}
              >
                {MARKOV_STATE_INFO[currentState].shortLabel}
              </span>
            </div>
          ) : (
            <div className="text-xs text-[#8892b0] italic py-3 text-center">
              Aguardando giros para identificar o estado atual...
            </div>
          )}

          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-[#8892b0]">
            <span>Origem prévia no rotor:</span>
            <strong className="text-slate-200">
              {previousState ? MARKOV_STATE_INFO[previousState].label : "—"}
            </strong>
          </div>
        </div>

        {/* CARD 2: MAIOR PROJEÇÃO / ALVO RECOMENDADO */}
        <div className="rounded-xl border border-[#08f7fe]/40 bg-gradient-to-r from-[#031520] to-[#0b0e14] p-3.5 flex flex-col justify-between shadow-[0_0_15px_rgba(8,247,254,0.15)]">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-2.5">
            <span className="text-xs font-bold uppercase text-[#08f7fe] flex items-center gap-1.5 whitespace-nowrap">
              <Sparkles className="h-3.5 w-3.5 text-[#08f7fe]" />
              TOP PROJEÇÃO MARKOV
            </span>
            {topPrediction && (
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded border uppercase whitespace-nowrap ${
                  topPrediction.recommendation === "FORTE"
                    ? "border-[#00FF88] bg-[#00FF88]/20 text-[#00FF88]"
                    : "border-sky-400 bg-sky-950/40 text-sky-300"
                }`}
              >
                RECOMENDAÇÃO {topPrediction.recommendation}
              </span>
            )}
          </div>

          {topPrediction ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-sm sm:text-base font-black text-white block truncate">
                    {topPrediction.label}
                  </span>
                  <span className="text-[11px] text-[#8892b0] block mt-0.5">
                    Transição com maior viés estocástico calculado
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xl sm:text-2xl font-black text-[#08f7fe] drop-shadow-[0_0_8px_#08f7fe] block leading-none">
                    {(topPrediction.probability * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-[#8892b0] mt-0.5 block">
                    (Δ: {topPrediction.deltaVsExpected > 0 ? "+" : ""}
                    {(topPrediction.deltaVsExpected * 100).toFixed(1)}% vs base)
                  </span>
                </div>
              </div>

              {/* NÚMEROS DO SETOR ALVO */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                <span className="text-[10px] font-bold text-[#8892b0] uppercase tracking-wider mr-1 whitespace-nowrap">
                  ALVOS DO SETOR:
                </span>
                {topPrediction.targetNumbers.map((num) => (
                  <button
                    key={`markov-num-${num}`}
                    type="button"
                    onClick={() => onSelectNumber?.(num)}
                    className="h-7 min-w-7 px-2 rounded-lg bg-black/60 border border-white/20 text-xs font-black text-white hover:border-[#08f7fe] hover:text-[#08f7fe] transition flex items-center justify-center cursor-pointer shadow"
                    title={`Clique para registrar ${num}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#8892b0] italic py-3 text-center">
              Insira mais giros para calibrar a projeção estocástica...
            </div>
          )}
        </div>
      </div>

      {/* TABELA / GRADE DE MARKOV MULTIDIMENSIONAL (7x7) COM BORDAS E ESPAÇAMENTOS PROFISSIONAIS */}
      <div className="rounded-xl border border-white/10 overflow-hidden bg-black/40">
        <div className="overflow-x-auto pb-1 scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-white/10 bg-[#0d1117] text-[10px] text-[#8892b0] uppercase">
                <th className="p-2.5 sticky left-0 z-10 bg-[#0d1117] w-32 border-r border-white/5 whitespace-nowrap">
                  De \ Para
                </th>
                {MARKOV_STATES.map((st) => (
                  <th
                    key={`th-${st}`}
                    className="p-2.5 text-center whitespace-nowrap font-black"
                    style={{ color: MARKOV_STATE_INFO[st].textColor }}
                  >
                    {MARKOV_STATE_INFO[st].shortLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MARKOV_STATES.map((fromState) => {
                const isCurrentFrom = currentState === fromState;
                const isInspected = inspectedState === fromState;

                return (
                  <tr
                    key={`row-${fromState}`}
                    onClick={() => setSelectedInspectState(fromState)}
                    className={`border-b border-white/5 transition-colors cursor-pointer ${
                      isCurrentFrom
                        ? "bg-indigo-950/40 border-l-4 border-l-[#08f7fe]"
                        : isInspected
                        ? "bg-white/5"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    {/* Célula do Estado de Origem */}
                    <td className="p-2.5 font-black text-[11px] uppercase sticky left-0 z-10 bg-[#0d1117] border-r border-white/5 whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1.5">
                        <span style={{ color: MARKOV_STATE_INFO[fromState].textColor }}>
                          {MARKOV_STATE_INFO[fromState].shortLabel}
                        </span>
                        {isCurrentFrom && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#08f7fe] animate-ping" />
                        )}
                      </div>
                    </td>

                    {/* Células de Transição */}
                    {MARKOV_STATES.map((toState) => {
                      const cell = matrix[fromState][toState];
                      const prob = cell.empiricalProb;
                      const delta = cell.deltaProb;
                      const count = cell.count;

                      let bgCell = "transparent";
                      if (prob >= 0.4) {
                        bgCell = "rgba(0, 255, 136, 0.22)";
                      } else if (prob >= 0.25) {
                        bgCell = "rgba(8, 247, 254, 0.16)";
                      } else if (prob >= 0.15) {
                        bgCell = "rgba(255, 255, 255, 0.04)";
                      }

                      return (
                        <td
                          key={`cell-${fromState}-${toState}`}
                          className="p-2 text-center text-xs font-mono transition-all border-r border-white/5 last:border-r-0"
                          style={{ backgroundColor: bgCell }}
                          title={`De ${fromState} para ${toState}: ${(prob * 100).toFixed(1)}% (${count}x)`}
                        >
                          {viewMode === "prob" ? (
                            <span
                              className={
                                cell.isHighProbability
                                  ? "font-black text-[#00FF88]"
                                  : prob > 0
                                  ? "text-slate-200"
                                  : "text-white/20"
                              }
                            >
                              {prob > 0 ? `${(prob * 100).toFixed(0)}%` : "—"}
                            </span>
                          ) : viewMode === "delta" ? (
                            <span
                              className={
                                delta > 0.05
                                  ? "font-black text-[#00FF88]"
                                  : delta < -0.05
                                  ? "text-rose-400"
                                  : "text-[#8892b0]"
                              }
                            >
                              {cell.totalFrom > 0
                                ? `${delta > 0 ? "+" : ""}${(delta * 100).toFixed(0)}%`
                                : "—"}
                            </span>
                          ) : (
                            <span className={count > 0 ? "text-white font-bold" : "text-white/20"}>
                              {count}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RODAPÉ: GUIA EXPLICATIVO */}
      <div className="mt-3 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8892b0]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#00FF88]">
            <span className="h-2 w-2 rounded bg-[#00FF88]/40 border border-[#00FF88]" />
            Alta Probabilidade (&gt; 35% ou Z &gt; 1.96)
          </span>
          <span className="flex items-center gap-1 text-[#08f7fe]">
            <span className="h-2 w-2 rounded bg-[#08f7fe]/40 border border-[#08f7fe]" />
            Moderada (25% — 35%)
          </span>
        </div>

        <span className="text-[#8892b0] italic">
          Linha com borda azul ciano = Último estado registrado na mesa.
        </span>
      </div>
    </div>
  );
}
