import React from "react";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Target,
  Sparkles,
} from "lucide-react";
import type { ConfluenceCalculation } from "@/lib/pattern-tracker-engine";
import { ConfluenceMainCard } from "./ConfluenceMainCard";
import { REDS } from "@/lib/roulette";

interface TacticalAlertsPanelProps {
  confluence: ConfluenceCalculation;
}

export function TacticalAlertsPanel({ confluence }: TacticalAlertsPanelProps) {
  const {
    statusEntrada,
    statusBadge,
    totalPadroesValidos,
    padroesValidos,
    somaGreensValidos,
    duziaMaisForte,
    colunaMaisForte,
    rankingDuzias,
    rankingColunas,
    numerosIntersecao,
    confiancaPerc,
    justificativa,
  } = confluence;

  const isConfirmada = statusEntrada === "CONFIRMADA";

  return (
    <aside
      className="flex flex-col gap-3 font-display w-full"
      aria-label="Painel de Alertas Tático"
    >
      {/* =========================================================================
          NOTIFICAÇÃO PRINCIPAL DE ENTRADA (ITEM 4: DESTAQUE NO LADO DIREITO)
          ========================================================================= */}
      <ConfluenceMainCard confluence={confluence} />

      {/* =========================================================================
          GRUPO "PADRÕES VÁLIDOS" (A REGRA DOS >60% APÓS 4 RODADAS)
          ========================================================================= */}
      <div className="rounded-2xl border-2 border-slate-700/80 bg-gradient-to-b from-[#091226]/95 via-[#040813]/98 to-[#091226]/95 p-3.5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-black uppercase text-white tracking-wider">
              GRUPO DE PADRÕES VÁLIDOS (&gt;60%)
            </h3>
          </div>
          <span className="rounded-full bg-emerald-950 px-2 py-0.5 font-mono text-[10px] font-bold text-[#00FF88] border border-emerald-500/40">
            {totalPadroesValidos} Ativo(s)
          </span>
        </div>

        {/* SOMA TOTAL DE GREENS DOS PADRÕES VÁLIDOS (ITEM 3 DO PROMPT) */}
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-black/70 p-2.5 shadow-[0_0_12px_rgba(0,255,136,0.15)] mb-3">
          <div>
            <span className="text-[9px] font-bold uppercase text-slate-400 block">
              SOMA DE GREENS ATUAIS
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">
              Dos padrões com taxa &gt; 60%
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono text-2xl font-black text-[#00FF88] drop-shadow-[0_0_12px_#00FF88]">
              +{somaGreensValidos}
            </span>
            <span className="text-[9px] text-slate-400 block uppercase font-mono">Greens</span>
          </div>
        </div>

        {/* LISTA DE PADRÕES QUE ATINGIRAM A META */}
        {padroesValidos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-black/40 p-3 text-center text-[10px] text-slate-400">
            <AlertTriangle className="h-4 w-4 text-amber-400 mx-auto mb-1" />
            Nenhum padrão superou os 60% após 4 rodadas validadas no momento.
            <div className="mt-1 text-[9px] text-slate-500">
              Continue registrando giros para maturar a amostragem isolada.
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {padroesValidos.map((p) => (
              <div
                key={`valido-${p.id}`}
                className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-950/20 px-2.5 py-1.5 font-mono text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-black text-white">{p.code}</span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {p.nome}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#00FF88]">
                    {p.totalGreens}G / {p.totalReds}R
                  </span>
                  <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[9px] font-black text-emerald-300 border border-emerald-500/50">
                    {p.taxaGreens.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =========================================================================
            BARRAS DE CONFLUÊNCIA: DÚZIAS E COLUNAS
            ========================================================================= */}
        <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-2.5">
          {/* Ranking das 3 Dúzias */}
          <div>
            <div className="flex justify-between text-[9px] font-bold uppercase text-slate-400 mb-1">
              <span>FORÇA DAS DÚZIAS</span>
              <span>DOMINÂNCIA</span>
            </div>
            <div className="space-y-1">
              {rankingDuzias.map((d, i) => (
                <div key={`rk-d-${d.idx}`} className="text-[10px]">
                  <div className="flex justify-between text-slate-300 font-mono mb-0.5">
                    <span className={i === 0 ? "text-[#00FF88] font-bold" : ""}>
                      {d.nome} {i === 0 && "★"}
                    </span>
                    <span className={i === 0 ? "text-[#00FF88] font-bold" : ""}>
                      {d.greens} Greens ({d.perc.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        i === 0 ? "bg-emerald-400 shadow-[0_0_6px_#00FF88]" : "bg-slate-600"
                      }`}
                      style={{ width: `${Math.max(8, d.perc)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ranking das 3 Colunas */}
          <div>
            <div className="flex justify-between text-[9px] font-bold uppercase text-slate-400 mb-1">
              <span>FORÇA DAS COLUNAS</span>
              <span>DOMINÂNCIA</span>
            </div>
            <div className="space-y-1">
              {rankingColunas.map((c, i) => (
                <div key={`rk-c-${c.idx}`} className="text-[10px]">
                  <div className="flex justify-between text-slate-300 font-mono mb-0.5">
                    <span className={i === 0 ? "text-[#00FF88] font-bold" : ""}>
                      {c.nome} {i === 0 && "★"}
                    </span>
                    <span className={i === 0 ? "text-[#00FF88] font-bold" : ""}>
                      {c.greens} Greens ({c.perc.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        i === 0 ? "bg-emerald-400 shadow-[0_0_6px_#00FF88]" : "bg-slate-600"
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
