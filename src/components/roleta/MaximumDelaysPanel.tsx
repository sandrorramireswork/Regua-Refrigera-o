import { useState, useMemo } from "react";
import {
  Activity,
  Flame,
  Columns3,
  Hash,
  TrendingUp,
  Award,
  Sparkles,
  Compass,
} from "lucide-react";

import {
  analisarMaximasCompletas,
  type MaximumDelays,
} from "@/lib/maximum-delays";
import type { Spin } from "@/lib/roulette";

interface MaximumDelaysPanelProps {
  delays?: MaximumDelays;
  spins?: Spin[];
}

export function MaximumDelaysPanel({ spins = [] }: MaximumDelaysPanelProps) {
  const [categoriaNotificacao, setCategoriaNotificacao] = useState<"duziasColunas" | "terminais" | "setores">("duziasColunas");

  // Análise completa de máximas históricas, do momento e probabilidades preditivas
  const analise = useMemo(() => {
    return analisarMaximasCompletas(spins);
  }, [spins]);

  const {
    maximaDoMomento,
    maximaTotalRegistrada,
    proximaDuzia,
    proximaColuna,
    proximoTerminal,
    proximoSetor,
  } = analise;

  const quebrouRecorde = maximaDoMomento.atraso >= maximaTotalRegistrada.atraso && maximaDoMomento.atraso > 0;

  return (
    <aside
      className="relative overflow-hidden rounded-2xl border-2 border-cyan-500/80 bg-gradient-to-b from-[#061826]/95 via-black/98 to-[#030d14]/95 p-2.5 sm:p-3 text-white shadow-[0_0_28px_rgba(6,182,212,0.4),inset_0_0_15px_rgba(6,182,212,0.12)] ring-1 ring-cyan-500/50 font-display transition-all"
      aria-labelledby="maximum-delays-title"
    >
      {/* Luzes Neon de Fundo */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 h-32 w-32 rounded-full bg-amber-500/15 blur-3xl" />

      {/* CABEÇALHO DO MONITORAMENTO TÁTICO FULL HD (SEM TRANSBORDAMENTO) */}
      <div className="flex items-center justify-between gap-1.5 border-b border-cyan-500/40 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neon-cyan text-black font-black shadow-[0_0_12px_rgba(0,255,255,0.8)]">
            <Activity className="size-4 shrink-0" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-[8px] uppercase tracking-wider text-neon-gold font-black text-stroke-black-sm leading-tight">
              Tempo Real
            </p>
            <h2 id="maximum-delays-title" className="font-display text-[11px] sm:text-xs font-black uppercase tracking-wide text-white text-stroke-black drop-shadow-[0_0_6px_rgba(0,255,255,0.6)] truncate leading-tight">
              MONITORAMENTO MÁXIMAS
            </h2>
          </div>
        </div>

        <span className="shrink-0 flex items-center gap-1 rounded-full border border-neon-cyan/70 bg-black/90 px-2 py-0.5 font-mono text-[9px] font-black text-neon-cyan shadow-[0_0_8px_rgba(0,255,255,0.4)] whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_4px_#00FFFF]" />
          <span>{spins.length}G</span>
        </span>
      </div>

      {/* ========================================================= */}
      {/* GRID DE NOTIFICAÇÃO DE MÁXIMAS E PROBABILIDADES DO MOMENTO */}
      {/* ========================================================= */}
      <div className="mt-2.5">
        <div className="rounded-xl border-2 border-amber-500/60 bg-gradient-to-b from-[#261803]/85 via-black/95 to-black/95 p-2 sm:p-2.5 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/30">
          {/* Header da Seção de Notificação */}
          <div className="flex items-center justify-between gap-1 border-b border-amber-500/30 pb-1.5 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="size-3.5 shrink-0 text-neon-gold drop-shadow-[0_0_6px_#FACC15] animate-pulse" />
              <span className="font-display text-[10.5px] sm:text-xs font-black uppercase tracking-tight text-white text-stroke-black drop-shadow-[0_0_6px_rgba(250,204,21,0.7)] truncate">
                NOTIFICAÇÃO DE MÁXIMAS
              </span>
            </div>
            {quebrouRecorde ? (
              <span className="shrink-0 flex items-center gap-1 rounded-full bg-red-950/90 border border-red-500 px-2 py-0.2 font-mono text-[8px] font-black text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.7)] animate-pulse">
                <Flame className="size-2.5 text-red-400" /> RECORDE
              </span>
            ) : (
              <span className="shrink-0 flex items-center gap-1 rounded-full bg-black/90 border border-amber-500/50 px-2 py-0.2 font-mono text-[8px] font-black text-amber-300 shadow-[0_0_6px_rgba(245,158,11,0.3)]">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_4px_#F59E0B]" />
                RADAR
              </span>
            )}
          </div>

          {/* SELETOR DE CATEGORIA TÁTICO FULL HD */}
          <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-black/90 border border-white/10 mb-2.5">
            <button
              onClick={() => setCategoriaNotificacao("duziasColunas")}
              className={`rounded-lg py-1 px-1 text-center font-display text-[9px] font-black uppercase tracking-tight transition-all cursor-pointer ${
                categoriaNotificacao === "duziasColunas"
                  ? "bg-neon-cyan/25 text-neon-cyan border border-neon-cyan shadow-[0_0_10px_rgba(0,255,255,0.5)]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Dúzias/Col
            </button>
            <button
              onClick={() => setCategoriaNotificacao("terminais")}
              className={`rounded-lg py-1 px-1 text-center font-display text-[9px] font-black uppercase tracking-tight transition-all cursor-pointer ${
                categoriaNotificacao === "terminais"
                  ? "bg-neon-gold/25 text-neon-gold border border-neon-gold shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Terminais
            </button>
            <button
              onClick={() => setCategoriaNotificacao("setores")}
              className={`rounded-lg py-1 px-1 text-center font-display text-[9px] font-black uppercase tracking-tight transition-all cursor-pointer ${
                categoriaNotificacao === "setores"
                  ? "bg-neon-magenta/25 text-neon-magenta border border-neon-magenta shadow-[0_0_10px_rgba(255,16,240,0.5)]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Setores
            </button>
          </div>

          {/* ======================================================== */}
          {/* VISÃO 1: DÚZIAS & COLUNAS (NÍVEL HARD FULL HD) */}
          {/* ======================================================== */}
          {categoriaNotificacao === "duziasColunas" && (
            <div className="space-y-2">
              {/* 1. CARDS PRINCIPAIS NA VERTICAL: MÁXIMA DO MOMENTO & MÁXIMA TOTAL */}
              <div className="grid grid-cols-1 gap-2">
                {/* Máxima do Momento */}
                <div className="relative flex flex-col justify-between rounded-xl border-2 border-neon-magenta bg-gradient-to-b from-fuchsia-950/40 via-black/95 to-black/95 p-2.5 shadow-[0_0_14px_rgba(255,16,240,0.3)] ring-1 ring-neon-magenta/40 overflow-hidden">
                  {/* Linha 1: Título e Status Badge */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display text-[8.5px] font-black uppercase text-neon-magenta flex items-center gap-1 truncate drop-shadow-[0_0_6px_#FF10F0]">
                      <Activity className="size-3 shrink-0" />
                      <span>MOMENTO</span>
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.2 text-[7.5px] font-black uppercase border ${
                        maximaDoMomento.nivel === "critico"
                          ? "bg-red-500/30 text-red-200 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse"
                          : maximaDoMomento.nivel === "atencao"
                            ? "bg-neon-gold/25 text-neon-gold border-neon-gold shadow-[0_0_8px_rgba(250,204,21,0.5)] animate-pulse"
                            : "bg-white/10 text-white/80 border-white/20"
                      }`}
                    >
                      {maximaDoMomento.nivel === "critico" ? "CRÍTICO" : maximaDoMomento.nivel === "atencao" ? "ALERTA" : "NORMAL"}
                    </span>
                  </div>

                  {/* Linha 2: Nome do Alvo */}
                  <div className="mt-1">
                    <p className="font-display text-[10.5px] sm:text-xs font-black text-white text-stroke-black-sm leading-tight truncate" title={maximaDoMomento.nome}>
                      {maximaDoMomento.nome}
                    </p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="font-display text-2xl font-black text-neon-magenta drop-shadow-[0_0_10px_#FF10F0] leading-none">
                        {maximaDoMomento.atraso}
                      </span>
                      <span className="text-[8px] font-black text-white/80 leading-tight uppercase">
                        sem sair
                      </span>
                    </div>
                  </div>

                  {/* Linha 3: Pressão Acumulada */}
                  <div className="mt-1.5 flex items-center justify-between text-[8px] border-t border-neon-magenta/30 pt-1">
                    <span className="text-white/80 font-black uppercase">Pressão:</span>
                    <span className="font-mono text-[9.5px] font-black text-neon-gold drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]">
                      {maximaDoMomento.maturacao.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Máxima Total Registrada */}
                <div className="relative flex flex-col justify-between rounded-xl border-2 border-neon-gold bg-gradient-to-b from-amber-950/40 via-black/95 to-black/95 p-2.5 shadow-[0_0_14px_rgba(250,204,21,0.3)] ring-1 ring-neon-gold/40 overflow-hidden">
                  {/* Linha 1: Título e Status Badge */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display text-[8.5px] font-black uppercase text-neon-gold flex items-center gap-1 truncate drop-shadow-[0_0_6px_#FACC15]">
                      <Award className="size-3 shrink-0 text-neon-gold" />
                      <span>RECORDE</span>
                    </span>
                    <span className="shrink-0 rounded bg-neon-gold/25 px-1.5 py-0.2 text-[7.5px] font-black text-neon-gold border border-neon-gold shadow-[0_0_8px_rgba(250,204,21,0.5)] uppercase">
                      MÁXIMO
                    </span>
                  </div>

                  {/* Linha 2: Nome do Alvo */}
                  <div className="mt-1">
                    <p className="font-display text-[10.5px] sm:text-xs font-black text-white text-stroke-black-sm leading-tight truncate" title={maximaTotalRegistrada.nome}>
                      {maximaTotalRegistrada.nome}
                    </p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="font-display text-2xl font-black text-neon-gold drop-shadow-[0_0_10px_#FACC15] leading-none">
                        {maximaTotalRegistrada.atraso}
                      </span>
                      <span className="text-[8px] font-black text-white/80 leading-tight uppercase">
                        giros máx
                      </span>
                    </div>
                  </div>

                  {/* Linha 3: Diferença */}
                  <div className="mt-1.5 flex items-center justify-between text-[8px] border-t border-neon-gold/30 pt-1">
                    <span className="text-white/80 font-black uppercase">Dif:</span>
                    <span className="font-mono text-[9px] font-black text-white text-stroke-black-sm truncate">
                      {maximaTotalRegistrada.atraso - maximaDoMomento.atraso > 0
                        ? `Faltam ${maximaTotalRegistrada.atraso - maximaDoMomento.atraso}G`
                        : "No Pico!"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. CARDS NA VERTICAL: PROBABILIDADE PRÓXIMA DÚZIA & PRÓXIMA COLUNA */}
              <div className="grid grid-cols-1 gap-2">
                {/* Próxima Dúzia */}
                <div className="rounded-xl border-2 border-neon-cyan/80 bg-gradient-to-b from-cyan-950/30 via-black/95 to-black/95 p-2 shadow-[0_0_14px_rgba(0,255,255,0.25)] ring-1 ring-neon-cyan/40 overflow-hidden">
                  <div className="flex items-center justify-between gap-1 border-b border-cyan-500/30 pb-1">
                    <span className="font-display text-[8.5px] font-black uppercase text-neon-cyan flex items-center gap-1 truncate drop-shadow-[0_0_6px_#00FFFF]">
                      <TrendingUp className="size-3 shrink-0" />
                      <span>PRÓX. DÚZIA</span>
                    </span>
                    <span className="shrink-0 rounded bg-cyan-950/90 border border-neon-cyan px-1.5 py-0.2 font-mono text-[8.5px] font-black text-neon-cyan shadow-[0_0_8px_rgba(0,255,255,0.4)]">
                      {proximaDuzia.recomendada.probabilidade.toFixed(0)}%
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-baseline justify-between gap-1">
                    <div className="min-w-0">
                      <span className="text-[7.5px] font-black text-white/60 uppercase block">ALVO:</span>
                      <span className="font-display text-[10.5px] font-black text-white text-stroke-black-sm block truncate" title={proximaDuzia.recomendada.nome}>
                        {proximaDuzia.recomendada.nome}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[7.5px] font-black text-white/60 uppercase block">ATRASO:</span>
                      <span className="font-mono text-[11px] font-black text-neon-gold drop-shadow-[0_0_6px_rgba(250,204,21,0.6)] block">
                        {proximaDuzia.recomendada.atrasoAtual}G
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    {proximaDuzia.itens.map((item) => (
                      <div key={item.grupo} className="flex items-center gap-1.5 text-[8.5px]">
                        <span className="w-5 font-mono font-black text-white text-stroke-black-sm">
                          D{item.grupo}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/90 border border-white/10">
                          <div
                            className="h-full bg-neon-cyan shadow-[0_0_8px_#00FFFF] rounded-full transition-all duration-500"
                            style={{ width: `${item.probabilidade}%` }}
                          />
                        </div>
                        <span className="w-7 text-right font-mono font-black text-neon-cyan text-stroke-black-sm">
                          {item.probabilidade.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Próxima Coluna */}
                <div className="rounded-xl border-2 border-neon-green/80 bg-gradient-to-b from-emerald-950/30 via-black/95 to-black/95 p-2 shadow-[0_0_14px_rgba(0,230,118,0.25)] ring-1 ring-neon-green/40 overflow-hidden">
                  <div className="flex items-center justify-between gap-1 border-b border-green-500/30 pb-1">
                    <span className="font-display text-[8.5px] font-black uppercase text-neon-green flex items-center gap-1 truncate drop-shadow-[0_0_6px_#00E676]">
                      <Columns3 className="size-3 shrink-0" />
                      <span>PRÓX. COLUNA</span>
                    </span>
                    <span className="rounded-full bg-emerald-950/90 border border-neon-green px-1.5 py-0.2 font-mono text-[8.5px] font-black text-neon-green shadow-[0_0_8px_rgba(0,230,118,0.4)]">
                      {proximaColuna.recomendada.probabilidade.toFixed(0)}%
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-baseline justify-between gap-1">
                    <div className="min-w-0">
                      <span className="text-[7.5px] font-black text-white/60 uppercase block">ALVO:</span>
                      <span className="font-display text-[10.5px] font-black text-white text-stroke-black-sm block truncate" title={proximaColuna.recomendada.nome}>
                        {proximaColuna.recomendada.nome}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[7.5px] font-black text-white/60 uppercase block">ATRASO:</span>
                      <span className="font-mono text-[11px] font-black text-neon-gold drop-shadow-[0_0_6px_rgba(250,204,21,0.6)] block">
                        {proximaColuna.recomendada.atrasoAtual}G
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    {proximaColuna.itens.map((item) => (
                      <div key={item.grupo} className="flex items-center gap-1.5 text-[8.5px]">
                        <span className="w-5 font-mono font-black text-white text-stroke-black-sm">
                          C{item.grupo}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/90 border border-white/10">
                          <div
                            className="h-full bg-neon-green shadow-[0_0_8px_#00E676] rounded-full transition-all duration-500"
                            style={{ width: `${item.probabilidade}%` }}
                          />
                        </div>
                        <span className="w-7 text-right font-mono font-black text-neon-green text-stroke-black-sm">
                          {item.probabilidade.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VISÃO 2: TERMINAIS 0–9 (NÍVEL HARD FULL HD) */}
          {/* ======================================================== */}
          {categoriaNotificacao === "terminais" && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2">
                {/* Máxima do Momento de Terminais */}
                <div className="relative flex flex-col justify-between rounded-xl border-2 border-neon-gold bg-gradient-to-b from-amber-950/40 via-black/95 to-black/95 p-2 shadow-[0_0_14px_rgba(250,204,21,0.3)] ring-1 ring-neon-gold/40 overflow-hidden">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display text-[8.5px] font-black uppercase text-neon-gold flex items-center gap-1 truncate drop-shadow-[0_0_6px_#FACC15]">
                      <Hash className="size-3 shrink-0" />
                      <span>ATRASADO</span>
                    </span>
                    <span className="shrink-0 rounded bg-neon-gold/25 px-1.5 py-0.2 text-[8px] font-black text-neon-gold border border-neon-gold">
                      T{proximoTerminal.maximaMomento.terminal}
                    </span>
                  </div>
                  <div className="my-1">
                    <p className="truncate font-display text-[11px] font-black text-white text-stroke-black-sm">
                      Terminal {proximoTerminal.maximaMomento.terminal}
                    </p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="font-display text-2xl font-black text-neon-gold drop-shadow-[0_0_10px_#FACC15] leading-none">
                        {proximoTerminal.maximaMomento.atraso}
                      </span>
                      <span className="text-[8px] font-black text-white/80 uppercase">
                        sem sair
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[8px] border-t border-neon-gold/30 pt-1">
                    <span className="text-white/80 font-black uppercase">Pressão:</span>
                    <span className="font-mono text-[9.5px] font-black text-neon-gold">
                      {proximoTerminal.maximaMomento.maturacao.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Máxima Total de Terminais */}
                <div className="relative flex flex-col justify-between rounded-xl border-2 border-white/40 bg-gradient-to-b from-white/10 via-black/95 to-black/95 p-2 shadow-[0_0_14px_rgba(255,255,255,0.2)] overflow-hidden">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display text-[8.5px] font-black uppercase text-white flex items-center gap-1 truncate text-stroke-black-sm">
                      <Award className="size-3 shrink-0 text-neon-gold" />
                      <span>RECORDE</span>
                    </span>
                    <span className="shrink-0 rounded bg-white/20 px-1.5 py-0.2 text-[8px] font-black text-white border border-white/40">
                      T{proximoTerminal.maximaTotal.terminal}
                    </span>
                  </div>
                  <div className="my-1">
                    <p className="truncate font-display text-[11px] font-black text-white text-stroke-black-sm">
                      Terminal {proximoTerminal.maximaTotal.terminal}
                    </p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="font-display text-2xl font-black text-white text-stroke-black leading-none">
                        {proximoTerminal.maximaTotal.atraso}
                      </span>
                      <span className="text-[8px] font-black text-white/80 uppercase">
                        pico máx
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[8px] border-t border-white/20 pt-1">
                    <span className="text-white/80 font-black uppercase">Dif:</span>
                    <span className="font-mono text-[9px] font-black text-white text-stroke-black-sm truncate">
                      {proximoTerminal.maximaTotal.atraso - proximoTerminal.maximaMomento.atraso > 0
                        ? `Faltam ${proximoTerminal.maximaTotal.atraso - proximoTerminal.maximaMomento.atraso}G`
                        : "No Pico!"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Probabilidades de Terminais 0-9 */}
              <div className="rounded-xl border-2 border-neon-gold/60 bg-gradient-to-b from-amber-950/20 via-black/95 to-black/95 p-2 shadow-[0_0_14px_rgba(250,204,21,0.2)] overflow-hidden">
                <div className="flex items-center justify-between text-[9px] border-b border-neon-gold/30 pb-1 mb-1.5">
                  <span className="font-display text-[8.5px] font-black uppercase text-neon-gold flex items-center gap-1 drop-shadow-[0_0_6px_#FACC15] truncate">
                    <TrendingUp className="size-3 shrink-0" />
                    <span>Recomendado: T{proximoTerminal.recomendado.terminal}</span>
                  </span>
                  <span className="shrink-0 rounded bg-neon-gold/25 px-1.5 py-0.2 text-[8.5px] font-mono font-black text-neon-gold border border-neon-gold">
                    {proximoTerminal.recomendado.probabilidade.toFixed(0)}%
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {proximoTerminal.itens.map((item) => (
                    <div
                      key={item.terminal}
                      className="flex flex-col justify-between rounded-lg bg-black/80 p-1 text-[8px] border border-white/10 hover:border-neon-gold/50 transition-all text-center"
                    >
                      <strong className="text-white text-[9px] font-black text-stroke-black-sm">T{item.terminal}</strong>
                      <span className="text-neon-gold font-mono font-black text-[8px]">{item.probabilidade.toFixed(0)}%</span>
                      <div className="h-1 my-0.5 overflow-hidden rounded-full bg-black/90 border border-white/10">
                        <div
                          className="h-full bg-neon-gold rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, item.probabilidade * 5)}%` }}
                        />
                      </div>
                      <span className="text-[7px] text-white/70 font-mono font-bold">{item.atrasoAtual}G</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VISÃO 3: SETORES DA ROLETA (NÍVEL HARD FULL HD) */}
          {/* ======================================================== */}
          {categoriaNotificacao === "setores" && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2">
                {/* Máxima do Momento de Setores */}
                <div className="relative flex flex-col justify-between rounded-xl border-2 border-neon-cyan bg-gradient-to-b from-cyan-950/40 via-black/95 to-black/95 p-2 shadow-[0_0_14px_rgba(0,255,255,0.3)] ring-1 ring-neon-cyan/40 overflow-hidden">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display text-[8.5px] font-black uppercase text-neon-cyan flex items-center gap-1 truncate drop-shadow-[0_0_6px_#00FFFF]">
                      <Compass className="size-3 shrink-0" />
                      <span>ATRASADO</span>
                    </span>
                    <span className="shrink-0 rounded bg-neon-cyan/25 px-1.5 py-0.2 text-[8px] font-black text-neon-cyan border border-neon-cyan">
                      {proximoSetor.maximaMomento.atraso}G
                    </span>
                  </div>
                  <div className="my-1">
                    <p className="truncate font-display text-[11px] font-black text-white text-stroke-black-sm">
                      {proximoSetor.maximaMomento.setor}
                    </p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="font-display text-2xl font-black text-neon-cyan drop-shadow-[0_0_10px_#00FFFF] leading-none">
                        {proximoSetor.maximaMomento.atraso}
                      </span>
                      <span className="text-[8px] font-black text-white/80 uppercase">
                        sem sair
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[8px] border-t border-neon-cyan/30 pt-1">
                    <span className="text-white/80 font-black uppercase">Pressão:</span>
                    <span className="font-mono text-[9.5px] font-black text-neon-cyan">
                      {proximoSetor.maximaMomento.maturacao.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Máxima Total de Setores */}
                <div className="relative flex flex-col justify-between rounded-xl border-2 border-white/40 bg-gradient-to-b from-white/10 via-black/95 to-black/95 p-2 shadow-[0_0_14px_rgba(255,255,255,0.2)] overflow-hidden">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-display text-[8.5px] font-black uppercase text-white flex items-center gap-1 truncate text-stroke-black-sm">
                      <Award className="size-3 shrink-0 text-neon-gold" />
                      <span>RECORDE</span>
                    </span>
                    <span className="shrink-0 rounded bg-white/20 px-1.5 py-0.2 text-[8px] font-black text-white border border-white/40">
                      {proximoSetor.maximaTotal.atraso}G
                    </span>
                  </div>
                  <div className="my-1">
                    <p className="truncate font-display text-[11px] font-black text-white text-stroke-black-sm">
                      {proximoSetor.maximaTotal.setor}
                    </p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="font-display text-2xl sm:text-3xl font-black text-white text-stroke-black leading-none">
                        {proximoSetor.maximaTotal.atraso}
                      </span>
                      <span className="text-[8px] font-black text-white/80 uppercase">
                        pico máx
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[8px] border-t border-white/20 pt-1">
                    <span className="text-white/80 font-black uppercase">Dif:</span>
                    <span className="font-mono text-[9px] font-black text-white text-stroke-black-sm truncate">
                      {proximoSetor.maximaTotal.atraso - proximoSetor.maximaMomento.atraso > 0
                        ? `Faltam ${proximoSetor.maximaTotal.atraso - proximoSetor.maximaMomento.atraso}G`
                        : "No Pico!"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Probabilidades dos Setores */}
              <div className="rounded-xl border-2 border-neon-cyan/60 bg-gradient-to-b from-cyan-950/20 via-black/95 to-black/95 p-2 shadow-[0_0_14px_rgba(0,255,255,0.2)] overflow-hidden">
                <div className="flex items-center justify-between text-[9px] border-b border-neon-cyan/30 pb-1 mb-1.5">
                  <span className="font-display text-[8.5px] font-black uppercase text-neon-cyan flex items-center gap-1 drop-shadow-[0_0_6px_#00FFFF] truncate">
                    <TrendingUp className="size-3 shrink-0" />
                    <span>Recomendado: {proximoSetor.recomendado.nome}</span>
                  </span>
                  <span className="shrink-0 rounded bg-neon-cyan/25 px-1.5 py-0.2 text-[8.5px] font-mono font-black text-neon-cyan border border-neon-cyan">
                    {proximoSetor.recomendado.probabilidade.toFixed(0)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {proximoSetor.itens.map((item) => (
                    <div
                      key={item.setorKey}
                      className="rounded-lg bg-black/80 p-1.5 text-[8.5px] border border-white/10 hover:border-neon-cyan/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-white text-[9.5px] font-black text-stroke-black-sm truncate">{item.nome}</strong>
                        <span className="text-neon-cyan font-mono font-black">{item.probabilidade.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 my-1 overflow-hidden rounded-full bg-black/90 border border-white/10">
                        <div
                          className="h-full bg-neon-cyan shadow-[0_0_8px_#00FFFF] rounded-full transition-all duration-500"
                          style={{ width: `${item.probabilidade}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[7.5px] text-white/70 font-mono font-bold">
                        <span>Atraso: <strong className="text-neon-gold">{item.atrasoAtual}G</strong></span>
                        <span>{item.frequencia}x</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}