import { Zap, Target, Sparkles, ShieldCheck, X } from "lucide-react";
import type { ConfluenceCalculation } from "@/lib/pattern-tracker-engine";
import { REDS } from "@/lib/roulette";

export interface ConfluenceMainCardProps {
  confluence: ConfluenceCalculation;
  onSelectNumber?: ((num: number) => void) | undefined;
  className?: string | undefined;
  onClose?: (() => void) | undefined;
}

export function ConfluenceMainCard({
  confluence,
  onSelectNumber,
  className = "",
  onClose,
}: ConfluenceMainCardProps) {
  const {
    totalPadroesValidos,
    somaGreensValidos,
    duziaMaisForte,
    colunaMaisForte,
    numerosIntersecao,
    pressaoConfluenciaGeral,
    isEntradaExpert,
    pressaoMinimaConfigurada,
    justificativa,
  } = confluence;

  const isConfirmed = isEntradaExpert;

  const subtituloDuzia =
    duziaMaisForte.idx === 1
      ? "1 a 12"
      : duziaMaisForte.idx === 2
      ? "13 a 24"
      : "25 a 36";

  const subtituloColuna =
    colunaMaisForte.idx === 1
      ? "Terminais 1, 4, 7..."
      : colunaMaisForte.idx === 2
      ? "Terminais 2, 5, 8..."
      : "Terminais 3, 6, 9...";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 transition-all font-display ${
        isConfirmed
          ? "neon-strobe-green bg-gradient-to-b from-[#031f11]/98 via-[#011208]/98 to-[#03150d]/95 ring-2 ring-[#00FF88]/60 shadow-[0_0_30px_rgba(0,255,136,0.35)]"
          : totalPadroesValidos > 0
          ? "border-cyan-500/50 bg-gradient-to-b from-[#041026]/95 via-[#020815]/98 to-[#041026]/95 shadow-[0_0_20px_rgba(0,229,255,0.2)] ring-1 ring-cyan-500/40"
          : "border-amber-500/50 bg-gradient-to-b from-[#180e03]/95 via-[#0b0601]/98 to-[#130903]/95 shadow-[0_0_16px_rgba(245,158,11,0.2)]"
      } p-3.5 sm:p-4 text-white ${className}`}
    >
      {/* Luzes neon de fundo */}
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl transition-all ${
          isConfirmed ? "bg-[#00FF88]/25" : "bg-cyan-500/15"
        }`}
      />

      {/* HEADER: NOTIFICAÇÃO PRINCIPAL + STATUS + PRESSÃO */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md ${
              isConfirmed
                ? "bg-[#00FF88] text-black shadow-[0_0_16px_#00FF88] animate-pulse"
                : "bg-cyan-950 text-cyan-400 border border-cyan-500/50"
            }`}
          >
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div>
            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-300">
              RADAR DE CONFLUÊNCIA TÁTICA
            </span>
            <span
              className={`text-xs sm:text-sm font-black uppercase tracking-wide flex items-center gap-1.5 ${
                isConfirmed
                  ? "text-[#00FF88] drop-shadow-[0_0_8px_#00FF88]"
                  : "text-cyan-300"
              }`}
            >
              {isConfirmed ? (
                <>
                  <Sparkles className="h-4 w-4 text-[#00FF88]" />
                  ENTRADA NÍVEL EXPERT CONFIRMADA
                </>
              ) : (
                "MONITORANDO PADRÕES (JANELA 30)"
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-lg px-2.5 py-1 font-mono text-[10px] font-black uppercase border shadow-sm ${
              isConfirmed
                ? "bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.3)] animate-pulse"
                : "bg-cyan-950/70 text-cyan-300 border-cyan-500/50"
            }`}
          >
            {pressaoConfluenciaGeral}% PRESSÃO
          </span>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Ocultar esta notificação"
              title="Ocultar esta notificação do Radar de Confluência"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-black/60 text-white/50 hover:text-white hover:border-red-400/60 hover:bg-red-950/40 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* SUB-GRID COM OS 2 CARDS: DÚZIA MAIS FORTE & COLUNA MAIS FORTE */}
      <div className="relative z-10 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* CARD DÚZIA MAIS FORTE */}
        <div className="rounded-xl border border-white/10 bg-black/75 p-3 shadow-[0_0_14px_rgba(0,255,136,0.1)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#00FF88]">
                DÚZIA MAIS FORTE
              </span>
              <span
                className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border ${
                  duziaMaisForte.hasMultiplicador
                    ? "bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88]"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}
              >
                {duziaMaisForte.multiplicador.toFixed(1)}x CONFLUÊNCIA
              </span>
            </div>
            <div className="my-1 font-mono text-xl sm:text-2xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
              {duziaMaisForte.nome}
            </div>
            <div className="text-[10px] font-mono text-slate-300 mb-2">
              <span>{subtituloDuzia}</span>
              <span className="text-slate-500 mx-1">·</span>
              <span className="text-[#00FF88] font-bold">+{duziaMaisForte.greens} Greens</span>
            </div>
          </div>

          {/* Barra de Progresso de Pressão */}
          <div>
            <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1">
              <span>Pressão de Confluência:</span>
              <span className="text-[#00FF88] font-black">{duziaMaisForte.perc}%</span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10 p-[1px]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  duziaMaisForte.hasMultiplicador
                    ? "bg-gradient-to-r from-cyan-400 to-[#00FF88] shadow-[0_0_8px_#00FF88]"
                    : "bg-cyan-500"
                }`}
                style={{ width: `${Math.max(12, duziaMaisForte.perc)}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD COLUNA MAIS FORTE */}
        <div className="rounded-xl border border-white/10 bg-black/75 p-3 shadow-[0_0_14px_rgba(0,255,136,0.1)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-cyan-300">
                COLUNA MAIS FORTE
              </span>
              <span
                className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border ${
                  colunaMaisForte.hasMultiplicador
                    ? "bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88]"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}
              >
                {colunaMaisForte.multiplicador.toFixed(1)}x CONFLUÊNCIA
              </span>
            </div>
            <div className="my-1 font-mono text-xl sm:text-2xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
              {colunaMaisForte.nome}
            </div>
            <div className="text-[10px] font-mono text-slate-300 mb-2">
              <span>{subtituloColuna}</span>
              <span className="text-slate-500 mx-1">·</span>
              <span className="text-cyan-300 font-bold">+{colunaMaisForte.greens} Greens</span>
            </div>
          </div>

          {/* Barra de Progresso de Pressão */}
          <div>
            <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1">
              <span>Pressão de Confluência:</span>
              <span className="text-cyan-300 font-black">{colunaMaisForte.perc}%</span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10 p-[1px]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  colunaMaisForte.hasMultiplicador
                    ? "bg-gradient-to-r from-cyan-400 to-[#00FF88] shadow-[0_0_8px_#00FF88]"
                    : "bg-cyan-500"
                }`}
                style={{ width: `${Math.max(12, colunaMaisForte.perc)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CARD CENTRAL: ALVOS DE INTERSEÇÃO DIRETA (DÚZIA ∩ COLUNA) */}
      <div className="relative z-10 mt-3 rounded-xl border border-white/10 bg-black/60 p-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-cyan-400" />
            ALVOS DE INTERSEÇÃO DIRETA ({duziaMaisForte.nome} ∩ {colunaMaisForte.nome})
          </span>
          <span className="font-mono text-[10px] font-bold text-cyan-400">
            {numerosIntersecao.length} Números
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {numerosIntersecao.map((num) => {
            const isRed = REDS.includes(num);
            return (
              <button
                key={`intersec-chip-${num}`}
                type="button"
                onClick={() => onSelectNumber?.(num)}
                className={`group flex h-12 items-center justify-center rounded-xl border-2 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                  isConfirmed
                    ? "border-[#00FF88] shadow-[0_0_16px_rgba(0,255,136,0.6)]"
                    : isRed
                    ? "border-[#FF003C] shadow-[0_0_14px_rgba(255,0,60,0.7)]"
                    : "border-white shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                } ${isRed ? "bg-[#FF003C]" : "bg-black"}`}
                title={`Número ${num} (${isRed ? "Vermelho" : "Preto"}) · Clique para registrar`}
              >
                <span className="font-mono text-xl font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                  {num}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FOOTER: PADRÕES VÁLIDOS (SCORE > 80) & SOMA TOTAL DE GREENS */}
      <div className="relative z-10 mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
        <div>
          <div className="text-xs font-black uppercase text-white tracking-wide flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#00FF88]" />
            PADRÕES VÁLIDOS (SCORE &gt; 80)
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {totalPadroesValidos} padrão(ões) qualificado(s) · Min {pressaoMinimaConfigurada}% Pressão
          </div>
        </div>

        <div className="text-right">
          <div className="text-[9px] font-black uppercase text-[#00FF88] tracking-wider">
            GREENS NA JANELA 30
          </div>
          <div className="font-mono text-2xl font-black text-[#00FF88] drop-shadow-[0_0_12px_#00FF88] leading-none">
            +{somaGreensValidos}
          </div>
        </div>
      </div>
    </div>
  );
}
