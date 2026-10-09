import React from "react";
import {
  Radar,
  ShieldCheck,
  Zap,
  Target,
  Sparkles,
  AlertTriangle,
  Flame,
  Activity,
  Layers,
  ArrowUpRight,
  TrendingDown,
} from "lucide-react";
import type { ConfluenceCalculation } from "@/lib/pattern-tracker-engine";
import { REDS } from "@/lib/roulette";

interface RadarOportunidadesPanelProps {
  confluence: ConfluenceCalculation;
  onSelectNumber?: ((num: number) => void) | undefined;
  onOpenSettings?: (() => void) | undefined;
}

export function RadarOportunidadesPanel({
  confluence,
  onSelectNumber,
  onOpenSettings,
}: RadarOportunidadesPanelProps) {
  const {
    statusEntrada,
    totalPadroesValidos,
    padroesValidos,
    somaGreensValidos,
    duziaMaisForte,
    colunaMaisForte,
    rankingDuzias,
    rankingColunas,
    numerosIntersecao,
    pressaoConfluenciaGeral,
    isEntradaExpert,
    pressaoMinimaConfigurada,
    justificativa,
  } = confluence;

  const isConfirmed = isEntradaExpert;

  return (
    <aside
      className="flex flex-col gap-3 font-display w-full"
      aria-label="Painel Lateral Direito: Radar de Oportunidades"
    >
      {/* =========================================================================
          CABEÇALHO DO RADAR DE OPORTUNIDADES
          ========================================================================= */}
      <div className="flex items-center justify-between rounded-xl border border-cyan-500/40 bg-gradient-to-r from-[#040e24] via-[#020713] to-[#040e24] p-3 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
              isConfirmed
                ? "border-[#00FF88] bg-emerald-950/80 text-[#00FF88] shadow-[0_0_12px_#00FF88]"
                : "border-cyan-500/50 bg-cyan-950/50 text-cyan-400"
            }`}
          >
            <Radar className={`h-5 w-5 ${isConfirmed ? "animate-spin" : ""}`} style={{ animationDuration: "8s" }} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                RADAR DE OPORTUNIDADES
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span>Filtro: Score &gt; 80</span>
              <span>·</span>
              <span className="text-cyan-400">Janela 30 Rodadas</span>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          title="Ajustar Pressão Mínima de Confluência"
          className="rounded-lg border border-cyan-500/40 bg-black/60 px-2 py-1 text-[10px] font-mono font-bold text-cyan-300 transition hover:bg-cyan-950 hover:border-cyan-400 cursor-pointer"
        >
          Min: <span className="text-white font-black">{pressaoMinimaConfigurada}%</span>
        </button>
      </div>

      {/* =========================================================================
          CARD PRINCIPAL COM ALERTA ESTROBOSCÓPICO SUTIL VERDE NEON
          (Ativado APENAS na confluência máxima confirmada - Entrada Nível Expert)
          ========================================================================= */}
      <div
        className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-500 ${
          isConfirmed
            ? "neon-strobe-green bg-gradient-to-b from-[#021f10]/95 via-[#011108]/98 to-[#021a0d]/95 ring-2 ring-[#00FF88]/50"
            : "border-slate-800 bg-gradient-to-b from-[#091226]/95 via-[#040813]/98 to-[#091226]/95 shadow-xl"
        } p-3.5 sm:p-4 text-white`}
      >
        {/* Glow de fundo */}
        <div
          className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl transition-opacity ${
            isConfirmed ? "bg-[#00FF88]/25 opacity-100" : "bg-cyan-500/10 opacity-40"
          }`}
        />

        {/* STATUS DA ENTRADA */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                isConfirmed
                  ? "bg-[#00FF88] text-black shadow-[0_0_12px_#00FF88] animate-pulse"
                  : "bg-cyan-950 text-cyan-400 border border-cyan-500/40"
              }`}
            >
              <Zap className="h-4 w-4 fill-current" />
            </div>
            <div>
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-300">
                {isConfirmed ? "CONFLUÊNCIA MÁXIMA CONFIRMADA" : "MONITORAMENTO DE PRESSÃO"}
              </span>
              <span
                className={`text-xs font-black uppercase tracking-wide ${
                  isConfirmed ? "text-[#00FF88] drop-shadow-[0_0_8px_#00FF88]" : "text-cyan-400"
                }`}
              >
                {isConfirmed ? "ENTRADA NÍVEL EXPERT" : statusEntrada === "STANDBY_AMOSTRA" ? "AGUARDANDO AMOSTRA" : "STANDBY · PROCURANDO CONFLUÊNCIA"}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`inline-block rounded-md px-2 py-0.5 font-mono text-[10px] font-black uppercase border shadow-sm ${
                isConfirmed
                  ? "bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.3)] animate-pulse"
                  : "bg-cyan-950/70 text-cyan-300 border-cyan-500/40"
              }`}
            >
              {pressaoConfluenciaGeral}% PRESSÃO
            </span>
          </div>
        </div>

        {/* =========================================================================
            BARRAS DE PROGRESSO DE PRESSÃO DE CONFLUÊNCIA (ITEM 4 DO PROMPT)
            ========================================================================= */}
        <div className="relative z-10 mt-3 space-y-3">
          {/* CARD DA DÚZIA MAIS FORTE COM BARRA DE PROGRESSO */}
          <div className="rounded-xl border border-white/10 bg-black/60 p-2.5 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88]" />
                {duziaMaisForte.nome} — {duziaMaisForte.perc}% de Pressão de Confluência
              </span>
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-black uppercase border ${
                  duziaMaisForte.hasMultiplicador
                    ? "bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.4)]"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}
              >
                {duziaMaisForte.multiplicador.toFixed(1)}x CONFLUÊNCIA
              </span>
            </div>

            {/* Barra de Progresso */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-white/10 p-[1px]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  duziaMaisForte.hasMultiplicador
                    ? "bg-gradient-to-r from-cyan-400 via-[#00FF88] to-[#00FF88] shadow-[0_0_10px_#00FF88]"
                    : "bg-gradient-to-r from-cyan-600 to-cyan-400"
                }`}
                style={{ width: `${Math.max(10, duziaMaisForte.perc)}%` }}
              />
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400 font-mono">
              <span>{duziaMaisForte.greens} Greens na janela</span>
              <span>
                {duziaMaisForte.padroesConvergentes.length > 0
                  ? `Padrões: ${duziaMaisForte.padroesConvergentes.join(", ")}`
                  : "Sem padrões > 80"}
              </span>
            </div>
          </div>

          {/* CARD DA COLUNA MAIS FORTE COM BARRA DE PROGRESSO */}
          <div className="rounded-xl border border-white/10 bg-black/60 p-2.5 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00F0FF]" />
                {colunaMaisForte.nome} — {colunaMaisForte.perc}% de Pressão de Confluência
              </span>
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-black uppercase border ${
                  colunaMaisForte.hasMultiplicador
                    ? "bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.4)]"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}
              >
                {colunaMaisForte.multiplicador.toFixed(1)}x CONFLUÊNCIA
              </span>
            </div>

            {/* Barra de Progresso */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-white/10 p-[1px]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  colunaMaisForte.hasMultiplicador
                    ? "bg-gradient-to-r from-cyan-400 via-[#00FF88] to-[#00FF88] shadow-[0_0_10px_#00FF88]"
                    : "bg-gradient-to-r from-cyan-600 to-cyan-400"
                }`}
                style={{ width: `${Math.max(10, colunaMaisForte.perc)}%` }}
              />
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400 font-mono">
              <span>{colunaMaisForte.greens} Greens na janela</span>
              <span>
                {colunaMaisForte.padroesConvergentes.length > 0
                  ? `Padrões: ${colunaMaisForte.padroesConvergentes.join(", ")}`
                  : "Sem padrões > 80"}
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CHIPS DE INTERSEÇÃO DIRETA (4 NÚMEROS: DÚZIA ∩ COLUNA)
            ========================================================================= */}
        <div className="relative z-10 mt-3 rounded-xl border border-white/10 bg-black/70 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-cyan-400" />
              ALVOS DE INTERSEÇÃO ({duziaMaisForte.nome} ∩ {colunaMaisForte.nome})
            </span>
            <span className="font-mono text-[9px] font-bold text-cyan-400">
              4 Números
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {numerosIntersecao.map((num) => {
              const isRed = REDS.includes(num);
              return (
                <button
                  key={`radar-intersec-${num}`}
                  type="button"
                  onClick={() => onSelectNumber?.(num)}
                  className={`group relative flex h-11 items-center justify-center rounded-xl border-2 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                    isConfirmed
                      ? "border-[#00FF88] shadow-[0_0_14px_rgba(0,255,136,0.6)]"
                      : isRed
                      ? "border-[#FF003C] shadow-[0_0_12px_rgba(255,0,60,0.5)]"
                      : "border-white/80 shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                  } ${isRed ? "bg-[#FF003C]" : "bg-black"}`}
                  title={`Registrar número ${num}`}
                >
                  <span className="font-mono text-lg font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    {num}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* JUSTIFICATIVA ANALÍTICA */}
        <p className="relative z-10 mt-2.5 text-[10px] text-slate-300 font-mono leading-relaxed bg-black/40 rounded-lg p-2 border border-white/5">
          {justificativa}
        </p>
      </div>

      {/* =========================================================================
          MATRIZ DE PADRÕES VÁLIDOS (SCORE > 80/100)
          ========================================================================= */}
      <div className="rounded-2xl border-2 border-slate-700/80 bg-gradient-to-b from-[#091226]/95 via-[#040813]/98 to-[#091226]/95 p-3.5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#00FF88]" />
            <h3 className="text-xs font-black uppercase text-white tracking-wider">
              PADRÕES VÁLIDOS (SCORE &gt; 80)
            </h3>
          </div>
          <span className="rounded-full bg-emerald-950 px-2 py-0.5 font-mono text-[10px] font-bold text-[#00FF88] border border-emerald-500/40">
            {totalPadroesValidos} Ativo(s)
          </span>
        </div>

        {/* SOMA DE GREENS DOS PADRÕES VÁLIDOS */}
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-black/70 p-2.5 shadow-[0_0_12px_rgba(0,255,136,0.15)] mb-3">
          <div>
            <span className="text-[9px] font-bold uppercase text-slate-400 block">
              SOMA DE GREENS (JANELA 30)
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">
              Padrões com Score &gt; 80 na janela
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono text-2xl font-black text-[#00FF88] drop-shadow-[0_0_12px_#00FF88]">
              +{somaGreensValidos}
            </span>
            <span className="text-[9px] text-slate-400 block uppercase font-mono">Greens</span>
          </div>
        </div>

        {/* LISTA DOS PADRÕES VÁLIDOS */}
        {padroesValidos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-black/40 p-3 text-center text-[10px] text-slate-400">
            <AlertTriangle className="h-4 w-4 text-amber-400 mx-auto mb-1" />
            Nenhum padrão atingiu Score &gt; 80 (com mín 6 rodadas) na janela deslizante atual.
            <div className="mt-1 text-[9px] text-slate-500">
              Continue registrando giros para maturar os padrões táticos.
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {padroesValidos.map((p) => (
              <div
                key={`radar-valido-${p.id}`}
                className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-950/20 px-2.5 py-1.5 font-mono text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-black text-white bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-500/50">
                    {p.code}
                  </span>
                  <span className="text-[10px] text-slate-300 truncate max-w-[120px]">
                    {p.nome}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#00FF88]">
                    {p.totalGreens}G / {p.totalReds}R
                  </span>
                  <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[9px] font-black text-[#00FF88] border border-emerald-400/60 shadow-[0_0_6px_rgba(0,255,136,0.3)]">
                    Score {p.scoreConfianca}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =========================================================================
            RANKINGS DAS 3 DÚZIAS E 3 COLUNAS COM MULTIPLICADOR (2.0x)
            ========================================================================= */}
        <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-3">
          {/* Ranking Dúzias */}
          <div>
            <div className="flex justify-between text-[9px] font-bold uppercase text-slate-400 mb-1">
              <span>PRESSÃO NAS DÚZIAS</span>
              <span>MULTIPLICADOR</span>
            </div>
            <div className="space-y-1.5">
              {rankingDuzias.map((d, i) => (
                <div key={`rk-d-${d.idx}`} className="text-[10px] bg-black/40 rounded p-1.5 border border-white/5">
                  <div className="flex justify-between text-slate-300 font-mono mb-1">
                    <span className={i === 0 ? "text-[#00FF88] font-bold flex items-center gap-1" : ""}>
                      {d.nome} {i === 0 && "★"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{d.perc}%</span>
                      <span
                        className={`text-[8.5px] px-1 py-0.2 rounded font-black ${
                          d.hasMultiplicador
                            ? "bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/60"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {d.multiplicador.toFixed(1)}x
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        d.hasMultiplicador
                          ? "bg-[#00FF88] shadow-[0_0_6px_#00FF88]"
                          : i === 0
                          ? "bg-cyan-400"
                          : "bg-slate-700"
                      }`}
                      style={{ width: `${Math.max(8, d.perc)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ranking Colunas */}
          <div>
            <div className="flex justify-between text-[9px] font-bold uppercase text-slate-400 mb-1">
              <span>PRESSÃO NAS COLUNAS</span>
              <span>MULTIPLICADOR</span>
            </div>
            <div className="space-y-1.5">
              {rankingColunas.map((c, i) => (
                <div key={`rk-c-${c.idx}`} className="text-[10px] bg-black/40 rounded p-1.5 border border-white/5">
                  <div className="flex justify-between text-slate-300 font-mono mb-1">
                    <span className={i === 0 ? "text-cyan-300 font-bold flex items-center gap-1" : ""}>
                      {c.nome} {i === 0 && "★"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{c.perc}%</span>
                      <span
                        className={`text-[8.5px] px-1 py-0.2 rounded font-black ${
                          c.hasMultiplicador
                            ? "bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/60"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {c.multiplicador.toFixed(1)}x
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        c.hasMultiplicador
                          ? "bg-[#00FF88] shadow-[0_0_6px_#00FF88]"
                          : i === 0
                          ? "bg-cyan-400"
                          : "bg-slate-700"
                      }`}
                      style={{ width: `${Math.max(8, c.perc)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
