import { Pin, Sparkles, Zap, ShieldAlert } from "lucide-react";
import type { MirrorSignal } from "@/lib/mirror-engine";
import { corDoNumero } from "./TabRodaAoVivo";

interface PinnedMirrorAlertProps {
  signal: MirrorSignal;
  onDismiss: () => void;
  onSelectNumber?: (num: number) => void;
  className?: string;
}

/**
 * Card de Alerta Fixado (Pinned) em Laranja Neon Vívido (#FF5E00)
 * Injetado no topo do Grid da Esquerda com permanência prioritária até dismiss manual.
 */
export function PinnedMirrorAlert({
  signal,
  onDismiss,
  onSelectNumber,
  className = "",
}: PinnedMirrorAlertProps) {
  const {
    raiz,
    gatilhos,
    alvosPrincipais,
    alvosMestres,
    todosAlvos,
    confianca,
    tags,
    justificativa,
    detalheFisico,
  } = signal;

  return (
    <div
      className={`pinned-alert relative overflow-hidden rounded-xl p-3.5 text-white transition-all shadow-2xl ${className}`}
      role="alert"
      aria-live="assertive"
    >
      {/* Botão de Fechar / Dismiss Manual */}
      <button
        onClick={onDismiss}
        className="close-alert absolute right-2.5 top-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-md border border-[#FF5E00] bg-black/80 font-display text-xs font-black text-[#FF5E00] transition-colors hover:bg-[#FF5E00] hover:text-black"
        title="Dispensar alerta de espelho fixado"
        aria-label="Dispensar alerta"
      >
        X
      </button>

      {/* Top Header com Ícone de Alerta Pinned */}
      <div className="flex items-center gap-2 border-b border-[#FF5E00]/40 pb-2 pr-8">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#FF5E00] text-black shadow-[0_0_10px_#FF5E00]">
          <Pin className="h-3.5 w-3.5 rotate-45" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-[11px] font-black uppercase tracking-wider text-[#FF5E00] drop-shadow-[0_0_8px_#FF5E00]">
            ALERTA FIXADO · ESPELHO & RAIZ
          </span>
          <span className="rounded bg-[#FF5E00]/25 px-1.5 py-0.2 font-mono text-[9px] font-bold text-white border border-[#FF5E00]/50">
            PINNED
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1 rounded bg-[#FF5E00]/20 px-2 py-0.5 border border-[#FF5E00]">
          <Zap className="h-3 w-3 text-[#FF5E00]" />
          <span className="font-display text-[11px] font-black text-white drop-shadow-[0_0_4px_#ffffff]">
            CONFIANÇA: {confianca}%
          </span>
        </div>
      </div>

      {/* Seção Principal: Números Sugeridos Ampliados */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-white/80 font-bold uppercase tracking-wide">
          <span>Números Recomendados para Entrada:</span>
          <span className="text-[9px] text-[#FF5E00]">Gatilho: {gatilhos.join(" e ")}</span>
        </div>

        {/* Alvos em Destaque 2rem (#FFFFFF com Glow #FF5E00) */}
        <div className="flex flex-wrap items-center gap-2">
          {todosAlvos.map((alvo) => {
            const ehMestre = alvosMestres.includes(alvo);
            return (
              <button
                key={alvo}
                type="button"
                onClick={() => onSelectNumber?.(alvo)}
                className="group relative flex items-center justify-center rounded-lg px-3 py-1 shadow-lg transition-transform hover:scale-105"
                style={{
                  background: corDoNumero(alvo),
                  border: corDoNumero(alvo) === "#000000" ? "2px solid #FFFFFF" : "2px solid #FF5E00",
                  boxShadow: corDoNumero(alvo) === "#FF003C" ? "0 0 16px rgba(255, 0, 60, 0.85)" : corDoNumero(alvo) === "#000000" ? "0 0 14px rgba(255, 255, 255, 0.75)" : "0 0 16px rgba(255, 94, 0, 0.85)",
                }}
                title={`Número ${alvo} ${ehMestre ? "(Mestre de Exceção)" : "(Terminal Raiz)"}`}
              >
                <span
                  style={{
                    fontSize: "2rem",
                    color: "#FFFFFF",
                    textShadow: "0 0 8px #FF5E00, 0 0 14px rgba(255, 94, 0, 0.8)",
                    fontWeight: 800,
                    lineHeight: "2.2rem",
                    textTransform: "uppercase",
                  }}
                  className="font-display tracking-tight"
                >
                  {alvo}
                </span>
                {ehMestre && (
                  <span className="absolute -bottom-1 -right-1 rounded bg-[#FF5E00] px-1 py-0.2 font-mono text-[7px] font-black uppercase text-black">
                    MESTRE
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags Visuais Condensadas */}
      <div className="mt-2.5 flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 rounded border border-[#FF5E00]/70 bg-[#FF5E00]/15 px-1.5 py-0.5 font-display text-[9px] font-black uppercase text-white shadow-[0_0_6px_rgba(255,94,0,0.3)]"
          >
            <Sparkles className="h-2.5 w-2.5 text-[#FF5E00]" />
            [{tag}]
          </span>
        ))}
      </div>

      {/* Justificativa Matemática e Detalhe Físico */}
      <div className="mt-2.5 space-y-1 rounded-md border border-[#FF5E00]/30 bg-black/70 p-2 text-[9.5px] leading-relaxed">
        <p className="text-white/95 font-medium">
          <span className="font-bold text-[#FF5E00]">Lógica Matemática: </span>
          {justificativa}
        </p>
        {detalheFisico && (
          <p className="text-[#FF5E00] font-bold">
            <span className="text-white/80">Confluência Física: </span>
            {detalheFisico}
          </p>
        )}
      </div>
    </div>
  );
}
