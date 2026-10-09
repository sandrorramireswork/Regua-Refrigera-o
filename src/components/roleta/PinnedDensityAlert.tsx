import { AlertOctagon, X, Zap, Layers, Sparkles } from "lucide-react";
import type { DensityRadarSignal } from "@/lib/density-radar";
import { corDoNumero } from "./TabRodaAoVivo";

interface PinnedDensityAlertProps {
  signal: DensityRadarSignal;
  onDismiss: () => void;
  onSelectNumber?: (num: number) => void;
  className?: string;
}

/**
 * Card de Alerta Fixado (Pinned) em Vermelho Neon Vívido (#FF0033)
 * Injetado no topo do Grid da Esquerda (Simulação de Luz de Emergência Realística)
 */
export function PinnedDensityAlert({
  signal,
  onDismiss,
  onSelectNumber,
  className = "",
}: PinnedDensityAlertProps) {
  const {
    labelAlvo,
    numeros,
    densidadeQuadrantePerc,
    forcaColunaPerc,
    forcaDuziaPerc,
    corTendencia,
    setorFisico,
    convergencia,
    confianca,
  } = signal;

  return (
    <div
      className={`pinned-alert density-radar-alert relative overflow-hidden rounded-xl p-3.5 text-white transition-all ${className}`}
      role="alert"
      aria-live="assertive"
    >
      {/* Botão de Fechar / Dismiss Manual */}
      <button
        onClick={onDismiss}
        className="close-alert absolute right-2.5 top-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-md border border-[#FF0033] bg-black/85 font-display text-xs font-black text-[#FF0033] transition-colors hover:bg-[#FF0033] hover:text-black cursor-pointer shadow-[0_0_8px_#FF0033]"
        title="Dispensar alerta de densidade fixado"
        aria-label="Dispensar alerta"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Top Header com Luz de Emergência Vermelho Neon */}
      <div className="flex items-center gap-2 border-b border-[#FF0033]/40 pb-2 pr-8">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#FF0033] text-black shadow-[0_0_12px_#FF0033] animate-pulse">
          <AlertOctagon className="h-4 w-4" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <h3
            className="font-display text-[12px] uppercase tracking-wider text-white"
            style={{
              fontWeight: 900,
              textShadow: "0 0 8px #FF0033, 0 0 16px rgba(255, 0, 51, 0.8)",
            }}
          >
            🚨 ALERTA: RADAR DE DENSIDADE
          </h3>
          <span className="rounded bg-[#FF0033]/25 px-1.5 py-0.2 font-mono text-[9px] font-black text-[#FF0033] border border-[#FF0033]/50">
            PINNED
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1 rounded bg-[#FF0033]/20 px-2 py-0.5 border border-[#FF0033] shadow-[0_0_10px_rgba(255,0,51,0.4)]">
          <Zap className="h-3 w-3 text-[#FF0033]" />
          <span
            className="font-display text-[12px] font-black text-white"
            style={{
              fontWeight: 900,
              textShadow: "0 0 8px #FF0033",
            }}
          >
            {confianca}% CONFIANÇA
          </span>
        </div>
      </div>

      {/* Identificação do Alvo (Coluna e Quadrante Exatos) */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-white/90">
            <Layers className="h-3.5 w-3.5 text-[#FF0033]" />
            <span>ALVO: {labelAlvo}</span>
          </div>
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#FF0033] border border-[#FF0033]/30">
            Densidade: {densidadeQuadrantePerc.toFixed(1)}%
          </span>
        </div>

        {/* Os 3 Números do Quadrante em Destaque Ampliado */}
        <div className="flex flex-wrap items-center gap-2">
          {numeros.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onSelectNumber?.(num)}
              className="group relative flex items-center justify-center rounded-lg px-3.5 py-1 shadow-lg transition-transform hover:scale-105 cursor-pointer"
              style={{
                background: corDoNumero(num),
                border: corDoNumero(num) === "#000000" ? "2px solid #FFFFFF" : "2px solid #FF003C",
                boxShadow: corDoNumero(num) === "#FF003C" ? "0 0 16px rgba(255, 0, 60, 0.85)" : "0 0 14px rgba(255, 255, 255, 0.75)",
              }}
              title={`Número ${num} (${labelAlvo})`}
            >
              <span
                style={{
                  fontSize: "2rem",
                  color: "#FFFFFF",
                  textShadow: "0 0 8px #FF0033, 0 0 16px rgba(255, 0, 51, 0.9)",
                  fontWeight: 900,
                  lineHeight: "2.2rem",
                  textTransform: "uppercase",
                }}
                className="font-display tracking-tight"
              >
                {num}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Aviso de Aproximação (Live Convergence / patternObserver) */}
      {convergencia?.ativa && (
        <div className="mt-2.5 rounded-md border border-[#FF0033] bg-[#FF0033]/15 p-2 shadow-[0_0_15px_rgba(255,0,51,0.3)] pulse-fast-tag">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-white">
            <span
              style={{
                textShadow: "0 0 6px #FF0033",
              }}
            >
              {convergencia.mensagem}
            </span>
          </div>
        </div>
      )}

      {/* Confluência de Variáveis Analisadas */}
      <div className="mt-2.5 grid grid-cols-2 gap-1.5 rounded-md border border-[#FF0033]/30 bg-black/70 p-2 text-[9px]">
        <div className="flex items-center justify-between text-white/80">
          <span>Força da Coluna:</span>
          <span className="font-mono font-bold text-white">{forcaColunaPerc.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between text-white/80">
          <span>Força da Dúzia:</span>
          <span className="font-mono font-bold text-white">{forcaDuziaPerc.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between text-white/80">
          <span>Tendência de Cor:</span>
          <span className={`font-mono font-bold ${corTendencia === "Vermelho" ? "text-rose-400" : "text-zinc-300"}`}>
            {corTendencia}
          </span>
        </div>
        <div className="flex items-center justify-between text-white/80">
          <span>Setor Físico:</span>
          <span className="font-mono font-bold text-neon-gold">{setorFisico}</span>
        </div>
      </div>
    </div>
  );
}
