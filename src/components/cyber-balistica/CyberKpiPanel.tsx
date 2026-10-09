import React from "react";
import { Activity, BarChart2, Layers, ShieldAlert, Cpu, Zap, Flame, AlertTriangle } from "lucide-react";
import type { CyberKpis } from "@/lib/cyber-balistica-engine";
import type { PoissonAnalysisResult } from "@/lib/three-tier-engine";

interface CyberKpiPanelProps {
  kpis: CyberKpis;
  poissonAnalysis?: PoissonAnalysisResult | undefined;
}

export function CyberKpiPanel({ kpis, poissonAnalysis }: CyberKpiPanelProps) {
  const { totalLidos, zerosCount, parImpar, cor, maiorMenor, duzias, colunas } = kpis;
  const alertasPoisson = poissonAnalysis?.alertasAtivos ?? [];

  return (
    <div className="flex flex-col gap-3 font-mono">
      {/* =========================================================================
          BANNER DE ALERTA POISSON: DESVIOS EXTREMOS (P < 0.05) NA JANELA DE 12 GIROS
          ========================================================================= */}
      {alertasPoisson.length > 0 && (
        <div className="rounded-2xl border border-cyan-400/50 bg-gradient-to-r from-[#04131a] via-[#0d0f12] to-[#1a0812] p-3 shadow-[0_0_20px_rgba(8,247,254,0.25)] animate-pulse">
          <div className="flex items-center justify-between mb-1.5 border-b border-cyan-500/20 pb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#08f7fe] flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-[#08f7fe]" />
              GATILHO POISSON ATIVO · JANELA CURTA (12 GIROS | λ = {poissonAnalysis?.lambdaBase ?? 3.89})
            </span>
            <span className="text-[9px] text-[#8892b0] uppercase font-bold">
              Desvio Crítico (P &lt; 5%)
            </span>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            {alertasPoisson.map((alerta) => (
              <div
                key={alerta.id}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 border text-xs font-black shadow-md ${
                  alerta.tipo === "SATURACAO_TENDENCIA"
                    ? "border-[#08f7fe] bg-[#08f7fe]/15 text-[#08f7fe] shadow-[0_0_12px_rgba(8,247,254,0.4)]"
                    : "border-rose-500 bg-rose-950/40 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                }`}
              >
                {alerta.tipo === "SATURACAO_TENDENCIA" ? (
                  <Flame className="h-3.5 w-3.5 text-[#08f7fe]" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                )}
                <div>
                  <span className="font-extrabold">{alerta.grupo}:</span>{" "}
                  <span className="font-normal text-[11px]">
                    {alerta.ocorrencias}x na janela (P = {alerta.probabilidadePerc}%) —{" "}
                    {alerta.tipo === "SATURACAO_TENDENCIA" ? "Super-Tendência / Saturação" : "Atraso Severo / Vácuo"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          1. MÉTRICAS BASE: GRID 2x2
          Par/Ímpar, Preto/Vermelho, Maior/Menor e Total de Lidos
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* CARD 1: PAR / ÍMPAR */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0f12] p-3.5 shadow-lg relative overflow-hidden group hover:border-[#08f7fe]/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#8892b0]">
              PAR / ÍMPAR
            </span>
            <Activity className="h-3.5 w-3.5 text-[#08f7fe]" />
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-[10px] text-[#8892b0] block">PAR:</span>
              <span className="text-xl sm:text-2xl font-black text-[#08f7fe] drop-shadow-[0_0_12px_#08f7fe]">
                {parImpar.percA.toFixed(1)}%
              </span>
              <span className="text-[10px] text-[#8892b0] block font-bold">({parImpar.countA}x)</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#8892b0] block">ÍMPAR:</span>
              <span className="text-xl sm:text-2xl font-black text-[#08f7fe] drop-shadow-[0_0_12px_#08f7fe]">
                {parImpar.percB.toFixed(1)}%
              </span>
              <span className="text-[10px] text-[#8892b0] block font-bold">({parImpar.countB}x)</span>
            </div>
          </div>

          {/* Barra de Proporção */}
          <div className="h-2 w-full rounded-full bg-black/60 overflow-hidden flex border border-white/5">
            <div
              className="h-full bg-[#08f7fe] transition-all duration-300 shadow-[0_0_8px_#08f7fe]"
              style={{ width: `${totalLidos > 0 ? parImpar.percA : 50}%` }}
            />
            <div
              className="h-full bg-[#1c2a38] transition-all duration-300"
              style={{ width: `${totalLidos > 0 ? parImpar.percB : 50}%` }}
            />
          </div>
        </div>

        {/* CARD 2: PRETO / VERMELHO */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0f12] p-3.5 shadow-lg relative overflow-hidden group hover:border-[#08f7fe]/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#8892b0]">
              PRETO / VERMELHO
            </span>
            <BarChart2 className="h-3.5 w-3.5 text-[#08f7fe]" />
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-[10px] text-[#8892b0] block">VERMELHO:</span>
              <span className="text-xl sm:text-2xl font-black text-[#08f7fe] drop-shadow-[0_0_12px_#08f7fe]">
                {cor.percA.toFixed(1)}%
              </span>
              <span className="text-[10px] text-[#8892b0] block font-bold">({cor.countA}x)</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#8892b0] block">PRETO:</span>
              <span className="text-xl sm:text-2xl font-black text-[#08f7fe] drop-shadow-[0_0_12px_#08f7fe]">
                {cor.percB.toFixed(1)}%
              </span>
              <span className="text-[10px] text-[#8892b0] block font-bold">({cor.countB}x)</span>
            </div>
          </div>

          {/* Barra de Proporção */}
          <div className="h-2 w-full rounded-full bg-black/60 overflow-hidden flex border border-white/5">
            <div
              className="h-full bg-[#FF003C] shadow-[0_0_12px_#FF003C] border-r border-[#FF003C] transition-all duration-300"
              style={{ width: `${totalLidos > 0 ? cor.percA : 50}%` }}
            />
            <div
              className="h-full bg-[#000000] border-l border-white/20 transition-all duration-300"
              style={{ width: `${totalLidos > 0 ? cor.percB : 50}%` }}
            />
          </div>
        </div>

        {/* CARD 3: MAIOR / MENOR */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0f12] p-3.5 shadow-lg relative overflow-hidden group hover:border-[#08f7fe]/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#8892b0]">
              MAIOR (19-36) / MENOR (1-18)
            </span>
            <Layers className="h-3.5 w-3.5 text-[#08f7fe]" />
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-[10px] text-[#8892b0] block">MENOR (1-18):</span>
              <span className="text-xl sm:text-2xl font-black text-[#08f7fe] drop-shadow-[0_0_12px_#08f7fe]">
                {maiorMenor.percA.toFixed(1)}%
              </span>
              <span className="text-[10px] text-[#8892b0] block font-bold">({maiorMenor.countA}x)</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#8892b0] block">MAIOR (19-36):</span>
              <span className="text-xl sm:text-2xl font-black text-[#08f7fe] drop-shadow-[0_0_12px_#08f7fe]">
                {maiorMenor.percB.toFixed(1)}%
              </span>
              <span className="text-[10px] text-[#8892b0] block font-bold">({maiorMenor.countB}x)</span>
            </div>
          </div>

          {/* Barra de Proporção */}
          <div className="h-2 w-full rounded-full bg-black/60 overflow-hidden flex border border-white/5">
            <div
              className="h-full bg-[#08f7fe] transition-all duration-300 shadow-[0_0_8px_#08f7fe]"
              style={{ width: `${totalLidos > 0 ? maiorMenor.percA : 50}%` }}
            />
            <div
              className="h-full bg-[#1c2a38] transition-all duration-300"
              style={{ width: `${totalLidos > 0 ? maiorMenor.percB : 50}%` }}
            />
          </div>
        </div>

        {/* CARD 4: TOTAL DE LIDOS */}
        <div className="rounded-2xl border border-[#08f7fe]/30 bg-gradient-to-br from-[#0d0f12] to-[#04131a] p-3.5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#8892b0]">
              TOTAL DE LIDOS (MAX 40)
            </span>
            <Cpu className="h-3.5 w-3.5 text-[#08f7fe]" />
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <div>
              <span className="text-2xl sm:text-3xl font-black text-[#08f7fe] drop-shadow-[0_0_15px_#08f7fe]">
                {totalLidos} <span className="text-base text-[#8892b0] font-normal">/ 40</span>
              </span>
            </div>
            <div className="text-right text-[10px] text-[#8892b0]">
              Janela deslizante ativa
            </div>
          </div>

          <div className="mt-2 text-[9px] text-[#8892b0] flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-emerald-400" />
            <span>Zero ({zerosCount}x) isolado do denominador percentual.</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. MÉTRICAS AVANÇADAS: 3 DÚZIAS (GRID 3x1) COM POISSON NA JANELA CURTA (12G)
          ========================================================================= */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0f12] p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-2.5 border-b border-white/10 pb-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#8892b0] flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[#08f7fe]" />
            RASTREAMENTO DAS 3 DÚZIAS (POISSON JANELA 12G)
          </span>
          <span className="text-[9px] text-[#8892b0]">Regra 33.3% Base · λ ≈ 3.89</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {duzias.map((dz, idx) => {
            const pItem = poissonAnalysis?.duzias[idx];
            return (
              <div
                key={`dz-kpi-${idx}`}
                className={`rounded-xl border bg-black/40 p-2.5 transition-all relative ${
                  pItem?.isDesvioExtremo
                    ? pItem.tipoAlerta === "SATURACAO_TENDENCIA"
                      ? "border-[#08f7fe] shadow-[0_0_12px_rgba(8,247,254,0.35)]"
                      : "border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                    : "border-white/10 hover:border-[#08f7fe]/50"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] font-bold text-[#8892b0] mb-1">
                  <span>{dz.name}</span>
                  <div className="flex items-center gap-1">
                    {pItem?.isDesvioExtremo && (
                      <span
                        className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase border ${
                          pItem.tipoAlerta === "SATURACAO_TENDENCIA"
                            ? "bg-[#08f7fe]/20 text-[#08f7fe] border-[#08f7fe] animate-pulse"
                            : "bg-rose-950 text-rose-400 border-rose-500"
                        }`}
                      >
                        {pItem.tipoAlerta === "SATURACAO_TENDENCIA" ? "Saturação" : "Vácuo"}
                      </span>
                    )}
                    <span>{dz.rangeDesc}</span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xl sm:text-2xl font-black text-[#08f7fe] drop-shadow-[0_0_10px_#08f7fe]">
                    {dz.perc.toFixed(1)}%
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-[#8892b0] block">{dz.count}x no total</span>
                    {pItem && (
                      <span className="text-[9px] text-[#00FF88] font-bold block">
                        {pItem.ocorrencias}x/12g (P={pItem.probabilidadeExata}%)
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-[#08f7fe] shadow-[0_0_8px_#08f7fe] transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, dz.perc))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          3. MÉTRICAS AVANÇADAS: 3 COLUNAS (GRID 3x1) COM POISSON NA JANELA CURTA (12G)
          ========================================================================= */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0f12] p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-2.5 border-b border-white/10 pb-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#8892b0] flex items-center gap-1.5">
            <BarChart2 className="h-3.5 w-3.5 text-[#08f7fe]" />
            RASTREAMENTO DAS 3 COLUNAS (POISSON JANELA 12G)
          </span>
          <span className="text-[9px] text-[#8892b0]">Regra 33.3% Base · λ ≈ 3.89</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {colunas.map((col, idx) => {
            const pItem = poissonAnalysis?.colunas[idx];
            return (
              <div
                key={`col-kpi-${idx}`}
                className={`rounded-xl border bg-black/40 p-2.5 transition-all relative ${
                  pItem?.isDesvioExtremo
                    ? pItem.tipoAlerta === "SATURACAO_TENDENCIA"
                      ? "border-[#08f7fe] shadow-[0_0_12px_rgba(8,247,254,0.35)]"
                      : "border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                    : "border-white/10 hover:border-[#08f7fe]/50"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] font-bold text-[#8892b0] mb-1">
                  <span>{col.name}</span>
                  <div className="flex items-center gap-1">
                    {pItem?.isDesvioExtremo && (
                      <span
                        className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase border ${
                          pItem.tipoAlerta === "SATURACAO_TENDENCIA"
                            ? "bg-[#08f7fe]/20 text-[#08f7fe] border-[#08f7fe] animate-pulse"
                            : "bg-rose-950 text-rose-400 border-rose-500"
                        }`}
                      >
                        {pItem.tipoAlerta === "SATURACAO_TENDENCIA" ? "Saturação" : "Vácuo"}
                      </span>
                    )}
                    <span className="truncate max-w-[80px]">{col.rangeDesc}</span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xl sm:text-2xl font-black text-[#08f7fe] drop-shadow-[0_0_10px_#08f7fe]">
                    {col.perc.toFixed(1)}%
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-[#8892b0] block">{col.count}x no total</span>
                    {pItem && (
                      <span className="text-[9px] text-[#00FF88] font-bold block">
                        {pItem.ocorrencias}x/12g (P={pItem.probabilidadeExata}%)
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-[#08f7fe] shadow-[0_0_8px_#08f7fe] transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, col.perc))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
