import React, { useEffect, useState } from "react";
import { Shield, Wind, Heart, AlertCircle, CheckCircle2 } from "lucide-react";
import type { AntiTiltState } from "@/lib/quantitative-terminal-engine";

interface RefugeAntiTiltModalProps {
  antiTiltState: AntiTiltState;
  onManualUnlock: () => void;
}

export function RefugeAntiTiltModal({
  antiTiltState,
  onManualUnlock,
}: RefugeAntiTiltModalProps) {
  const { isActive, remainingSeconds, reason, averageSpeedMs } = antiTiltState;
  const [breathingPhase, setBreathingPhase] = useState<"INSPIRE" | "SEGURE" | "EXPIRE">("INSPIRE");
  const [canBypass, setCanBypass] = useState(false);

  // Ciclo de respiração guiada (4s Inspire -> 4s Segure -> 4s Expire)
  useEffect(() => {
    if (!isActive) return;

    let timer: NodeJS.Timeout;
    const interval = setInterval(() => {
      setBreathingPhase((prev) => {
        if (prev === "INSPIRE") return "SEGURE";
        if (prev === "SEGURE") return "EXPIRE";
        return "INSPIRE";
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Libera bypass consciente após 15 segundos de reflexão
  useEffect(() => {
    if (!isActive) {
      setCanBypass(false);
      return;
    }
    const timeout = setTimeout(() => {
      setCanBypass(true);
    }, 15000);
    return () => clearTimeout(timeout);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl font-mono transition-all duration-700">
      {/* Container com estética serena em tons pastéis frios (Sem neon, sem agressividade) */}
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-700/60 bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#020617] p-6 sm:p-8 text-slate-200 shadow-2xl shadow-slate-900/90 text-center animate-fade-in">
        {/* Ícone de Proteção Zen */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-600/50 bg-slate-800/80 text-sky-300 shadow-inner">
          <Wind className="h-8 w-8 animate-pulse text-sky-300" />
        </div>

        {/* TÍTULO PRINCIPAL E MENSAGEM OBRIGATÓRIA */}
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 block mb-1">
          FILTRO COMPORTAMENTAL ANTI-TILT · MODO REFÚGIO
        </span>

        <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mb-2">
          Pico de Adrenalina Detectado.
        </h2>

        <p className="text-base sm:text-lg font-medium text-sky-200/90 italic mb-6">
          “Respire. O mercado continuará lá.”
        </p>

        {/* CÍRCULO VISUAL DE RESPIRAÇÃO GUIADA */}
        <div className="relative mx-auto my-6 flex h-40 w-40 items-center justify-center">
          {/* Anel Externo Expansível */}
          <div
            className={`absolute inset-0 rounded-full border-2 border-sky-400/30 transition-all duration-[4000ms] ease-in-out ${
              breathingPhase === "INSPIRE"
                ? "scale-110 border-sky-400/70 bg-sky-500/10"
                : breathingPhase === "SEGURE"
                ? "scale-105 border-indigo-400/60 bg-indigo-500/15"
                : "scale-90 border-slate-500/40 bg-slate-800/10"
            }`}
          />

          {/* Anel Médio */}
          <div
            className={`absolute h-28 w-28 rounded-full border border-sky-300/40 transition-all duration-[4000ms] ${
              breathingPhase === "INSPIRE"
                ? "scale-105 opacity-80"
                : breathingPhase === "SEGURE"
                ? "scale-100 opacity-90"
                : "scale-85 opacity-40"
            }`}
          />

          {/* Centro com Fase e Contador */}
          <div className="z-10 flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              {breathingPhase}
            </span>
            <span className="text-3xl font-black text-slate-100 tabular-nums">
              {remainingSeconds}s
            </span>
            <span className="text-[9px] text-sky-300/80 font-medium">
              BLOQUEIO ATIVO
            </span>
          </div>
        </div>

        {/* TELEMETRIA DO DISPARO DO TILT */}
        <div className="mb-6 rounded-2xl border border-slate-700/50 bg-slate-900/60 p-3 text-left text-xs text-slate-400">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="flex items-center gap-1.5 font-bold text-slate-300">
              <Heart className="h-3.5 w-3.5 text-rose-400" />
              Diagnóstico Biopsicológico:
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
              Proteção de Capital
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-400">
            {reason || "Entrada de dados em velocidade anômala detectada."} Cadência média:{" "}
            <strong className="text-slate-200">{averageSpeedMs || 340}ms</strong> por clique.
            O cérebro em modo reativo tende a elevar o risco e sabotar o plano de trading.
          </p>
        </div>

        {/* AÇÕES E DESBLOQUEIO CONSCIENTE */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="text-xs text-slate-400">
            Inputs bloqueados temporariamente para salvaguarda de banca.
          </div>

          {canBypass ? (
            <button
              type="button"
              onClick={onManualUnlock}
              className="flex items-center gap-2 rounded-xl border border-sky-400/40 bg-sky-950/60 px-4 py-2 text-xs font-bold text-sky-200 hover:bg-sky-900/60 transition cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4 text-sky-400" />
              <span>Estou calmo e lúcido (Desbloquear)</span>
            </button>
          ) : (
            <span className="text-[10px] text-slate-400 italic">
              Desbloqueio voluntário liberado em breve...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
