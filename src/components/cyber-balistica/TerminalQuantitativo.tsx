import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Shield,
  Zap,
  Flame,
  Activity,
  Compass,
  GitCommit,
  Layers,
  Sparkles,
  Sliders,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  calcularIndiceEntropia,
  calcularMatrizMarkovMultidimensional,
  calcularZScoreEspacial,
  avaliarModoLayout,
  AntiTiltBehavioralProxy,
  type MorphingLayoutMode,
  type AntiTiltState,
} from "@/lib/quantitative-terminal-engine";
import { ShannonEntropyBar } from "./ShannonEntropyBar";
import { MarkovMatrixVisualizer } from "./MarkovMatrixVisualizer";
import { SpatialZScoreClusters } from "./SpatialZScoreClusters";
import { RefugeAntiTiltModal } from "./RefugeAntiTiltModal";

interface TerminalQuantitativoProps {
  numeros: number[];
  onSelectNumber?: (num: number) => void;
  bankrollTotal?: number;
}

export function TerminalQuantitativo({
  numeros,
  onSelectNumber,
  bankrollTotal = 1000,
}: TerminalQuantitativoProps) {
  // 1. Estado do Anti-Tilt Behavioral Proxy
  const [antiTiltState, setAntiTiltState] = useState<AntiTiltState>(() =>
    AntiTiltBehavioralProxy.getStatus(),
  );

  // Monitora continuamente o timer do Anti-Tilt quando ativo
  useEffect(() => {
    if (!antiTiltState.isActive) return;

    const interval = setInterval(() => {
      const current = AntiTiltBehavioralProxy.getStatus();
      setAntiTiltState(current);
    }, 500);

    return () => clearInterval(interval);
  }, [antiTiltState.isActive]);

  const handleManualUnlock = useCallback(() => {
    AntiTiltBehavioralProxy.manualUnlock();
    setAntiTiltState(AntiTiltBehavioralProxy.getStatus());
  }, []);

  // 2. Override manual do modo de layout (Auto vs Predador vs Escudo vs Teste Refúgio)
  const [manualModeOverride, setManualModeOverride] = useState<MorphingLayoutMode | null>(null);

  // 3. Motores Quantitativos Avançados
  // A. Termômetro do Caos (Entropia de Shannon em 25 giros)
  const entropyAnalysis = useMemo(() => {
    return calcularIndiceEntropia(numeros, 25);
  }, [numeros]);

  // B. Z-Score Espacial dos Clusters Balísticos (Arcos físicos de 5 bolsões)
  const spatialZScore = useMemo(() => {
    return calcularZScoreEspacial(numeros, 50);
  }, [numeros]);

  // C. Matriz de Markov Multidimensional (Cor + Setor Voisins/Tiers/Orphelins)
  const markovMatrix = useMemo(() => {
    return calcularMatrizMarkovMultidimensional(numeros);
  }, [numeros]);

  // D. Avaliador de Estado da UI Mutante (Predador vs Escudo vs Refúgio)
  const morphingLayout = useMemo(() => {
    return avaliarModoLayout(
      entropyAnalysis,
      spatialZScore,
      antiTiltState.isActive,
      manualModeOverride,
    );
  }, [entropyAnalysis, spatialZScore, antiTiltState.isActive, manualModeOverride]);

  // E. Cálculo do Dimensionamento de Kelly em Moeda
  const kellyStakeValor = useMemo(() => {
    const perc = morphingLayout.kellyRecommendation.suggestedStakePercent;
    if (perc <= 0) return 0;
    return Math.round((bankrollTotal * (perc / 100)) * 100) / 100;
  }, [bankrollTotal, morphingLayout.kellyRecommendation.suggestedStakePercent]);

  return (
    <div
      className={`w-full rounded-3xl transition-all duration-700 ease-out font-mono p-3 sm:p-5 relative ${morphingLayout.themeClasses.containerBorder} ${morphingLayout.themeClasses.glowShadow} ${morphingLayout.themeClasses.bgOverlay}`}
    >
      {/* MODAL / OVERLAY ANTI-TILT EM MODO REFÚGIO */}
      <RefugeAntiTiltModal
        antiTiltState={antiTiltState}
        onManualUnlock={handleManualUnlock}
      />

      {/* =========================================================================
          1. TICKER SUPERIOR BLOOMBERG HUD: TELEMETRIA QUANTITATIVA AO VIVO
          ========================================================================= */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
        {/* TÍTULO E STATUS DO MODO MUTANTE */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all duration-500 ${
              morphingLayout.currentMode === "PREDATOR"
                ? "border-[#00FF88] bg-[#00FF88]/20 text-[#00FF88] shadow-[0_0_15px_#00FF88]"
                : morphingLayout.currentMode === "SHIELD"
                ? "border-rose-500/50 bg-rose-950/40 text-rose-300"
                : "border-sky-400 bg-sky-950/50 text-sky-200"
            }`}
          >
            {morphingLayout.currentMode === "PREDATOR" ? (
              <Zap className="h-6 w-6 animate-pulse text-[#00FF88]" />
            ) : morphingLayout.currentMode === "SHIELD" ? (
              <Shield className="h-6 w-6 text-rose-400" />
            ) : (
              <Lock className="h-6 w-6 text-sky-300" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase flex items-center gap-2">
                TERMINAL QUANTITATIVO BLOOMBERG
              </h1>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${morphingLayout.themeClasses.statusBadge}`}>
                {morphingLayout.modeBadge}
              </span>
            </div>
            <p className="text-[11px] text-[#8892b0]">
              {morphingLayout.tacticalDirective}
            </p>
          </div>
        </div>

        {/* CONTROLES DO OPERADOR: SELETOR DE MODO MUTANTE */}
        <div className="flex items-center gap-1.5 self-start md:self-auto rounded-2xl bg-black/60 p-1 border border-white/10 text-[10px]">
          <span className="text-[#8892b0] px-2 font-bold uppercase hidden sm:inline">
            MODO UI:
          </span>

          <button
            type="button"
            onClick={() => setManualModeOverride(null)}
            className={`rounded-xl px-2.5 py-1 font-black transition cursor-pointer ${
              manualModeOverride === null
                ? "bg-[#08f7fe]/25 text-[#08f7fe] border border-[#08f7fe]/50 shadow-[0_0_10px_rgba(8,247,254,0.3)]"
                : "text-[#8892b0] hover:text-white"
            }`}
          >
            AUTO (DINÂMICO)
          </button>

          <button
            type="button"
            onClick={() => setManualModeOverride("PREDATOR")}
            className={`rounded-xl px-2.5 py-1 font-black transition cursor-pointer ${
              manualModeOverride === "PREDATOR"
                ? "bg-[#00FF88]/25 text-[#00FF88] border border-[#00FF88]/50 shadow-[0_0_10px_rgba(0,255,136,0.3)]"
                : "text-[#8892b0] hover:text-white"
            }`}
          >
            PREDADOR (ATAQUE)
          </button>

          <button
            type="button"
            onClick={() => setManualModeOverride("SHIELD")}
            className={`rounded-xl px-2.5 py-1 font-black transition cursor-pointer ${
              manualModeOverride === "SHIELD"
                ? "bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                : "text-[#8892b0] hover:text-white"
            }`}
          >
            ESCUDO (DEFESA)
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. FEATURE DE OURO 1: O "ÍNDICE DE ENTROPIA" (TERMÔMETRO DO CAOS)
          ========================================================================= */}
      <div className="mb-4">
        <ShannonEntropyBar entropy={entropyAnalysis} />
      </div>

      {/* =========================================================================
          3. SESSÃO MUTANTE: MODO PREDADOR (EXPANDIDO) vs MODO ESCUDO (RECOLHIDO)
          ========================================================================= */}
      {morphingLayout.currentMode === "PREDATOR" ? (
        /* ======================== PAINEL MODO PREDADOR ======================== */
        <div className="mb-4 rounded-2xl border-2 border-[#00FF88] bg-gradient-to-r from-[#002619] via-[#04171e] to-[#002619] p-4 shadow-[0_0_30px_rgba(0,255,136,0.25)] animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-[#00FF88]/30 pb-2.5">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-[#00FF88] animate-bounce" />
              <span className="text-sm font-black text-[#00FF88] uppercase tracking-wider">
                JANELA DE OPORTUNIDADE BALÍSTICA · CALCULADORA HALF-KELLY
              </span>
            </div>
            <span className="text-[10px] bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/40 px-2 py-0.5 rounded font-black">
              CONVERGÊNCIA: Z = +{spatialZScore.maxZScore.toFixed(2)} SD
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* ALVO DO CLUSTER */}
            <div className="md:col-span-6 bg-black/60 rounded-xl p-3 border border-[#00FF88]/30">
              <span className="text-[10px] text-[#8892b0] uppercase font-bold block mb-1">
                CLUSTER ALVO RECOMENDADO:
              </span>
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-black text-white">
                  {morphingLayout.kellyRecommendation.recommendedCluster?.name ?? "Cluster Arc"} (
                  {morphingLayout.kellyRecommendation.recommendedCluster?.sector})
                </span>
                <span className="text-xs font-black text-[#00FF88]">
                  Edge: +{morphingLayout.kellyRecommendation.edgePercent}%
                </span>
              </div>

              {/* NÚMEROS DO CLUSTER */}
              <div className="flex items-center gap-1.5">
                {morphingLayout.kellyRecommendation.recommendedCluster?.numbers.map((n) => (
                  <button
                    key={`pred-num-${n}`}
                    type="button"
                    onClick={() => onSelectNumber?.(n)}
                    className="h-7 w-7 rounded-lg bg-[#00FF88]/20 border border-[#00FF88] text-white text-xs font-black hover:scale-110 transition flex items-center justify-center cursor-pointer shadow-[0_0_8px_rgba(0,255,136,0.4)]"
                    title={`Registrar número ${n}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* SUGESTÃO DE STAKE KELLY */}
            <div className="md:col-span-6 bg-black/60 rounded-xl p-3 border border-[#00FF88]/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#8892b0] uppercase font-bold block mb-0.5">
                  DIMENSIONAMENTO HALF-KELLY:
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#00FF88] drop-shadow-[0_0_10px_#00FF88]">
                  {morphingLayout.kellyRecommendation.suggestedStakePercent}% da Banca
                </span>
                <span className="text-[11px] text-slate-300 block">
                  Aposta sugerida:{" "}
                  <strong className="text-white">
                    R$ {kellyStakeValor.toFixed(2)}
                  </strong>{" "}
                  (Banca R$ {bankrollTotal.toFixed(2)})
                </span>
              </div>

              <div className="text-right">
                <span className="text-[9px] text-[#8892b0] uppercase block">
                  Vantagem Estocástica
                </span>
                <span className="text-sm font-black text-[#08f7fe]">
                  P(Hit) ={" "}
                  {(
                    (morphingLayout.kellyRecommendation.recommendedCluster?.empiricalProb ?? 0.135) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ======================== PAINEL MODO ESCUDO ======================== */
        <div className="mb-4 rounded-2xl border border-rose-900/60 bg-gradient-to-r from-[#170507] via-[#0c090c] to-[#170507] p-3.5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-rose-400" />
              <div>
                <span className="text-xs font-black text-rose-300 uppercase tracking-wider block">
                  MODO ESCUDO ATIVO · GESTÃO E PRESERVAÇÃO DE CAPITAL
                </span>
                <span className="text-[11px] text-[#8892b0]">
                  Gatilhos agressivos recolhidos. Ruído elevado ou dispersão aleatória identificada.
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-rose-400 font-bold bg-rose-950/60 px-2 py-1 rounded border border-rose-800/50">
                APOSTA RECOMENDADA: R$ 0,00 (PASSIVIDADE)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. FERRAMENTAS QUANTITATIVAS: Z-SCORE ESPACIAL & MATRIZ DE MARKOV
          ========================================================================= */}
      <div className="flex flex-col gap-5">
        {/* Z-SCORE ESPACIAL E ANOMALIAS CRÍTICAS */}
        <SpatialZScoreClusters
          spatialAnalysis={spatialZScore}
          onSelectNumber={onSelectNumber}
        />

        {/* MATRIZ DE MARKOV MULTIDIMENSIONAL (COR + SETOR) */}
        <MarkovMatrixVisualizer
          markovResult={markovMatrix}
          onSelectNumber={onSelectNumber}
        />
      </div>
    </div>
  );
}
