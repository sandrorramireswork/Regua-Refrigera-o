import React from "react";
import { Activity, AlertOctagon, CheckCircle2, Flame, Info, ShieldAlert } from "lucide-react";
import type { ShannonEntropyResult } from "@/lib/quantitative-terminal-engine";

interface ShannonEntropyBarProps {
  entropy: ShannonEntropyResult;
}

export function ShannonEntropyBar({ entropy }: ShannonEntropyBarProps) {
  const {
    entropyPercent,
    normalizedEntropy,
    level,
    statusLabel,
    statusDescription,
    sinaisLiberados,
    shannonEntropy,
    maxEntropy,
    actualSpinsCount,
    windowSize,
  } = entropy;

  // Cor da barra de progresso baseada no nível de caos
  const barGradient =
    level === "BAIXA"
      ? "from-[#00E676] via-[#00FF88] to-[#08f7fe]"
      : level === "MEDIA"
      ? "from-[#08f7fe] via-[#ffaa00] to-[#ff7700]"
      : "from-[#ff6600] via-[#ff003c] to-[#ff0055]";

  const glowStyle =
    level === "BAIXA"
      ? "shadow-[0_0_15px_rgba(0,255,136,0.6)]"
      : level === "MEDIA"
      ? "shadow-[0_0_15px_rgba(8,247,254,0.5)]"
      : "shadow-[0_0_20px_rgba(255,0,60,0.8)]";

  return (
    <div className="relative w-full rounded-2xl border border-white/10 bg-[#0a0d14]/90 backdrop-blur-md p-3 sm:p-4 font-mono shadow-2xl transition-all duration-500 overflow-hidden">
      {/* Background ambient subtle glow */}
      <div
        className={`absolute -right-20 -top-20 h-44 w-44 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700 ${
          level === "BAIXA"
            ? "bg-[#00FF88]"
            : level === "MEDIA"
            ? "bg-[#08f7fe]"
            : "bg-[#FF003C]"
        }`}
      />

      {/* HEADER DO TERMÔMETRO: TÍTULO, MÉTRICA E STATUS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
              level === "BAIXA"
                ? "border-[#00FF88]/50 bg-[#00FF88]/15 text-[#00FF88]"
                : level === "MEDIA"
                ? "border-[#08f7fe]/50 bg-[#08f7fe]/15 text-[#08f7fe]"
                : "border-[#FF003C]/50 bg-[#FF003C]/15 text-[#FF003C] animate-pulse"
            }`}
          >
            {level === "BAIXA" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : level === "MEDIA" ? (
              <Activity className="h-4 w-4" />
            ) : (
              <AlertOctagon className="h-4 w-4" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                ÍNDICE DE ENTROPIA DE SHANNON
                <span className="text-[10px] font-bold text-[#8892b0] bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                  TERMÔMETRO DO CAOS ({actualSpinsCount}/{windowSize} GIROS)
                </span>
              </span>
            </div>
            <p className="text-[11px] text-[#8892b0] leading-tight">
              {statusDescription}
            </p>
          </div>
        </div>

        {/* VALOR PERCENTUAL & BADGE DE STATUS */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="text-right">
            <span className="text-[9px] uppercase tracking-widest text-[#8892b0] block">
              ENTROPIA H(X)
            </span>
            <span
              className={`text-xl sm:text-2xl font-black tracking-tight drop-shadow ${
                level === "BAIXA"
                  ? "text-[#00FF88]"
                  : level === "MEDIA"
                  ? "text-[#08f7fe]"
                  : "text-[#FF003C]"
              }`}
            >
              {entropyPercent}%
            </span>
          </div>

          <div
            className={`flex flex-col items-center rounded-xl px-2.5 py-1 border text-[10px] font-black uppercase tracking-wider ${
              sinaisLiberados
                ? "border-[#00FF88]/40 bg-[#00FF88]/10 text-[#00FF88]"
                : "border-[#FF003C]/50 bg-[#FF003C]/15 text-[#FF003C] animate-pulse shadow-[0_0_12px_rgba(255,0,60,0.4)]"
            }`}
          >
            <span>{sinaisLiberados ? "GATILHOS LIBERADOS" : "GATILHOS BLOQUEADOS"}</span>
            <span className="text-[8px] font-medium text-[#8892b0]">
              {sinaisLiberados ? "Mesa em Padrão" : "Risco Extremo (Ruído)"}
            </span>
          </div>
        </div>
      </div>

      {/* BARRA HORIZONTAL PRINCIPAL COM MARCADORES QUANTITATIVOS */}
      <div className="relative pt-1 pb-1">
        {/* Trilho base */}
        <div className="relative h-4 sm:h-5 w-full rounded-full bg-black/70 p-0.5 border border-white/10 overflow-hidden">
          {/* Preenchimento Dinâmico com Gradiente Térmico */}
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out ${glowStyle}`}
            style={{ width: `${Math.max(4, Math.min(100, entropyPercent))}%` }}
          />

          {/* Marcador de Linha em 68% (Transição Baixa -> Média) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/80 z-10 pointer-events-none"
            style={{ left: "68%" }}
            title="Limiar de Transição: 68%"
          />

          {/* Marcador de Linha em 82% (Bloqueio de Risco: Alta Entropia) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#FF003C] z-10 pointer-events-none shadow-[0_0_6px_#FF003C]"
            style={{ left: "82%" }}
            title="Limiar Crítico de Bloqueio: 82%"
          />
        </div>

        {/* RÉGUA E LEGENDA DOS LIMITES DA ENTROPIA */}
        <div className="mt-1 flex items-center justify-between text-[9px] font-bold text-[#8892b0]">
          <span className="flex items-center gap-1 text-[#00FF88]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00FF88]" />
            0% — 68%: MESA LEGÍVEL (OPORTUNIDADE)
          </span>

          <span className="hidden md:inline-flex items-center gap-1 text-[#ffaa00]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffaa00]" />
            68% — 82%: TRANSIÇÃO
          </span>

          <span className="flex items-center gap-1 text-[#FF003C]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF003C] animate-ping" />
            &gt; 82%: RUÍDO BRANCO (BLOQUEIO)
          </span>
        </div>
      </div>

      {/* RODAPÉ TÉCNICO BLOOMBERG: BITS & DETALHES DE SHANNON */}
      <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8892b0]">
        <div className="flex items-center gap-3">
          <span>
            <strong className="text-white">H(X):</strong> {shannonEntropy} bits
          </span>
          <span className="text-white/20">|</span>
          <span>
            <strong className="text-white">H_max:</strong> {maxEntropy} bits
          </span>
          <span className="text-white/20">|</span>
          <span>
            <strong className="text-white">Taxa:</strong> {(normalizedEntropy * 100).toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center gap-1 text-[10px]">
          <Info className="h-3 w-3 text-[#08f7fe]" />
          <span>
            Fórmula: <code className="text-[#08f7fe] bg-black/40 px-1 py-0.2 rounded">-Σ p(x) log₂(p(x))</code>
          </span>
        </div>
      </div>
    </div>
  );
}
