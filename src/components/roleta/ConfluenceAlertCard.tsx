import { Flame, Sparkles, Target, Zap } from "lucide-react";
import type { CandidateConfluence } from "@/lib/confluence-engine";
import { corDoNumero } from "./TabRodaAoVivo";

interface ConfluenceAlertCardProps {
  candidate: CandidateConfluence;
  onSelectCandidate?: (num: number) => void;
  className?: string;
}

/**
 * Card de Notificação de Alta Prioridade em Laranja Neon Vívido (#FF5E00)
 * Injetado no Grid da Esquerda com efeito de glow contínuo e altíssimo contraste.
 */
export function ConfluenceAlertCard({
  candidate,
  onSelectCandidate,
  className = "",
}: ConfluenceAlertCardProps) {
  const { number: num, confidence, tags, breakdown, sector } = candidate;

  return (
    <div
      onClick={() => onSelectCandidate?.(num)}
      style={{
        borderColor: "#FF5E00",
        boxShadow: "0 0 15px #FF5E00, 0 0 30px #FF5E00, inset 0 0 15px rgba(255, 94, 0, 0.22)",
      }}
      className={`group relative overflow-hidden rounded-xl border-2 bg-black/90 p-3 text-white transition-all cursor-pointer select-none animate-pulse ${className}`}
    >
      {/* Luz ambiente de fundo neon laranja */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#FF5E00]/25 blur-2xl" />
      <div className="pointer-events-none absolute -left-8 -bottom-8 h-28 w-28 rounded-full bg-[#FF3300]/20 blur-2xl" />

      {/* Cabeçalho do Alerta */}
      <div className="flex items-center justify-between gap-2 border-b border-[#FF5E00]/50 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FF5E00] text-black shadow-[0_0_12px_#FF5E00]">
            <Flame className="h-4 w-4 animate-bounce" />
          </div>
          <div>
            <span className="font-display text-[11px] font-black uppercase tracking-wider text-[#FF5E00] drop-shadow-[0_0_8px_#FF5E00]">
              ALERTA DE ALTA PRIORIDADE
            </span>
            <div className="text-[9px] font-bold text-white/80">
              Confluência Tripla de Motores Ativada
            </div>
          </div>
        </div>

        {/* Badge da Porcentagem Final */}
        <div className="flex items-center gap-1 rounded-md border border-[#FF5E00] bg-[#FF5E00]/20 px-2.5 py-1 shadow-[0_0_10px_rgba(255,94,0,0.5)]">
          <Zap className="h-3.5 w-3.5 text-[#FF5E00]" />
          <span className="font-display text-xs font-black tracking-wide text-white drop-shadow-[0_0_4px_#ffffff]">
            CONFIANÇA: {confidence}%
          </span>
        </div>
      </div>

      {/* Conteúdo Principal do Alerta */}
      <div className="mt-2.5 flex items-center gap-3">
        {/* Número Alvo em Destaque Gigante com Peso 900 */}
        <div className="relative shrink-0">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-xl font-display text-4xl font-black text-white shadow-2xl ring-2 ring-[#FF5E00]"
            style={{
              background: corDoNumero(num),
              border: corDoNumero(num) === "#000000" ? "3px solid #FFFFFF" : corDoNumero(num) === "#FF003C" ? "3px solid #FF003C" : "3px solid #00FF88",
              boxShadow: corDoNumero(num) === "#FF003C" ? "0 0 24px rgba(255, 0, 60, 0.9)" : corDoNumero(num) === "#000000" ? "0 0 20px rgba(255, 255, 255, 0.85)" : "0 0 24px rgba(0, 255, 136, 0.9)",
              textShadow: "0 0 12px rgba(255, 255, 255, 0.9), 0 0 20px #FF5E00",
            }}
          >
            {num}
          </div>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-[#FF5E00] px-1 py-0.2 text-[8px] font-black uppercase text-black">
            ALVO
          </span>
        </div>

        {/* Detalhes do Alvo e Setor */}
        <div className="flex flex-1 flex-col justify-center min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-black text-white drop-shadow-[0_0_6px_#ffffff]">
              Número {num}
            </span>
            <span className="rounded bg-[#FF5E00]/25 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#FF5E00] border border-[#FF5E00]/50">
              {sector}
            </span>
          </div>
          <div className="text-[10px] font-bold text-white/90 mt-0.5">
            Dúzia {candidate.dozen}ª · Coluna {candidate.column}ª · {candidate.color === "red" ? "Vermelho" : candidate.color === "black" ? "Preto" : "Zero Verde"}
          </div>
          <div className="text-[9px] text-white/70">
            {candidate.microFrequency} saídas recentes · sem sair há {candidate.delay} giros
          </div>
        </div>
      </div>

      {/* Tags Visuais Condensadas Justificando o Alerta */}
      <div className="mt-2.5 flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 rounded border border-[#FF5E00]/80 bg-[#FF5E00]/15 px-1.5 py-0.5 font-display text-[9px] font-black uppercase text-white shadow-[0_0_6px_rgba(255,94,0,0.35)]"
          >
            <Sparkles className="h-2.5 w-2.5 text-[#FF5E00]" />
            [{tag}]
          </span>
        ))}
      </div>

      {/* Breakdown Analítico das 3 Engines */}
      <div className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-lg border border-[#FF5E00]/40 bg-black/60 p-1.5 text-[9px]">
        <div>
          <div className="flex justify-between text-white/80 font-bold">
            <span>Micro & Física</span>
            <span className="text-[#FF5E00] font-mono font-black">{breakdown.engine1_micro}%</span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-[#FF5E00] shadow-[0_0_6px_#FF5E00]"
              style={{ width: `${breakdown.engine1_micro}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-white/80 font-bold">
            <span>Padrões Grupo</span>
            <span className="text-[#FF5E00] font-mono font-black">{breakdown.engine2_patterns}%</span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-[#FF5E00] shadow-[0_0_6px_#FF5E00]"
              style={{ width: `${breakdown.engine2_patterns}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-white/80 font-bold">
            <span>Macro Regressão</span>
            <span className="text-[#FF5E00] font-mono font-black">{breakdown.engine3_macro}%</span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-[#FF5E00] shadow-[0_0_6px_#FF5E00]"
              style={{ width: `${breakdown.engine3_macro}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
