import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Flame,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Zap,
  TrendingUp,
  Activity,
  CheckCircle2,
  XCircle,
  BarChart2,
  Wallet,
  Coins,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";
import type { Spin, Padrao } from "@/lib/roulette";
import { REDS } from "@/lib/roulette";
import {
  analyzeDecisionEngine,
  registrarResultadoDecisao,
  type DecisionEngineResult,
  type EstadoDecisao,
} from "@/lib/decision-engine";
import { DecisionEngineSparkline } from "./DecisionEngineSparkline";
import {
  loadSessaoOperacional,
  EVENT_OPERACIONAL_CHANGE,
  type SessaoFinanceiraOperacional,
} from "@/lib/gestao-operacional-engine";
import { toast } from "sonner";
import { tocarAlerta } from "@/lib/notify";

export interface DecisionEngineAlertCardProps {
  spins: Spin[];
  padroes?: Padrao[] | undefined;
  onSelectNumber?: ((num: number) => void) | undefined;
  className?: string | undefined;
  onOpenBankrollTab?: (() => void) | undefined;
}

function corDoNumero(n: number) {
  if (n === 0) return "#00E676";
  return REDS.includes(n) ? "#FF003C" : "#000000";
}

export function DecisionEngineAlertCard({
  spins,
  padroes,
  onSelectNumber,
  className = "",
  onOpenBankrollTab,
}: DecisionEngineAlertCardProps) {
  // 1. ANÁLISE ESTRITA DA JANELA DE 30 RODADAS PELO MOTOR DE DECISÃO
  const decisao: DecisionEngineResult = useMemo(() => {
    return analyzeDecisionEngine(spins, padroes);
  }, [spins, padroes]);

  // 2. ESTADO DA SESSÃO FINANCEIRA (ROI, BANCA E HISTÓRICO)
  const [sessao, setSessao] = useState<SessaoFinanceiraOperacional>(loadSessaoOperacional);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [lastValidation, setLastValidation] = useState<"GREEN" | "RED" | null>(null);

  // Sincronização em tempo real da sessão via eventos e localStorage
  useEffect(() => {
    const handleSync = () => {
      setSessao(loadSessaoOperacional());
    };
    window.addEventListener(EVENT_OPERACIONAL_CHANGE, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(EVENT_OPERACIONAL_CHANGE, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Notificação sonora discreta ao atingir Estado 1 (Alavancagem Máxima)
  useEffect(() => {
    if (decisao.estado === 1) {
      try {
        tocarAlerta();
      } catch {}
    }
  }, [decisao.estado, decisao.duziaRecomendada, decisao.colunaRecomendada]);

  // 3. HANDLER DOS SMART BUTTONS ('GREEN' E 'RED')
  const handleValidarResultado = useCallback(
    async (resultado: "GREEN" | "RED") => {
      if (isProcessingAction) return;
      setIsProcessingAction(true);

      try {
        const res = await registrarResultadoDecisao(resultado, decisao);
        setSessao(res.novaSessao);
        setLastValidation(resultado);

        if (resultado === "GREEN") {
          toast.success(res.mensagem, {
            description: `Banca: R$ ${res.novaSessao.bancaAtual.toFixed(2)} | ROI: ${res.novoRoi >= 0 ? "+" : ""}${res.novoRoi}%`,
            duration: 4000,
          });
        } else {
          toast.error(res.mensagem, {
            description: `Banca: R$ ${res.novaSessao.bancaAtual.toFixed(2)} | ROI: ${res.novoRoi >= 0 ? "+" : ""}${res.novoRoi}%`,
            duration: 4000,
          });
        }
      } catch (err) {
        toast.error("Erro ao registrar resultado na sessão.");
      } finally {
        setIsProcessingAction(false);
      }
    },
    [isProcessingAction, decisao]
  );

  const { estado, confiancaPerc, hitRate30, totalRodadasJanela } = decisao;

  // ESTILOS DINÂMICOS CONFORME OS 3 ESTADOS DEFINIDOS PELO USUÁRIO
  // ESTADO 1: Borda neon verde pulsante
  // ESTADO 2: Borda neon amarela/laranja
  // ESTADO 3: Card neutro (preto/cinza) com sutis tons de vermelho
  const cardBorderClass = useMemo(() => {
    switch (estado) {
      case 1:
        return "border-2 border-[#00FF66] shadow-[0_0_30px_rgba(0,255,102,0.4),inset_0_0_15px_rgba(0,255,102,0.12)] animate-pulse ring-2 ring-[#00FF66]/50";
      case 2:
        return "border-2 border-[#FFA000] shadow-[0_0_24px_rgba(255,160,0,0.35),inset_0_0_12px_rgba(255,160,0,0.1)] ring-1 ring-[#FFA000]/40";
      case 3:
      default:
        return "border border-red-500/30 bg-[#090b10] shadow-[0_0_16px_rgba(239,68,68,0.15)]";
    }
  }, [estado]);

  const cardGradientBg = useMemo(() => {
    switch (estado) {
      case 1:
        return "bg-gradient-to-b from-[#021f11]/95 via-[#011108]/98 to-[#02180d]/95";
      case 2:
        return "bg-gradient-to-b from-[#221202]/95 via-[#120701]/98 to-[#1c0d02]/95";
      case 3:
      default:
        return "bg-gradient-to-b from-[#140608]/95 via-[#08080c]/98 to-[#12070a]/95";
    }
  }, [estado]);

  const accentColor = estado === 1 ? "#00FF66" : estado === 2 ? "#FFA000" : "#EF4444";
  const accentTextClass = estado === 1 ? "text-[#00FF66]" : estado === 2 ? "text-[#FFA000]" : "text-red-400";
  const accentBadgeBg = estado === 1 ? "bg-[#00FF66]/20 border-[#00FF66] text-[#00FF66]" : estado === 2 ? "bg-[#FFA000]/20 border-[#FFA000] text-[#FFA000]" : "bg-red-500/20 border-red-500/40 text-red-300";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-3.5 sm:p-4 font-display text-white transition-all ${cardBorderClass} ${cardGradientBg} ${className}`}
      data-component="decision-engine-alert-card"
    >
      {/* Luz ambiente de fundo neon */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl opacity-30 transition-all"
        style={{ backgroundColor: accentColor }}
      />
      <div
        className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full blur-3xl opacity-20 transition-all"
        style={{ backgroundColor: accentColor }}
      />

      {/* =========================================================================
          CABEÇALHO DO MOTOR: ESTADO DINÂMICO + HIT RATE (ÚLTIMAS 30 RODADAS)
          ========================================================================= */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl shadow-md border ${
              estado === 1
                ? "bg-[#00FF66] text-black border-[#00FF66] shadow-[0_0_14px_#00FF66] animate-pulse"
                : estado === 2
                ? "bg-[#FFA000] text-black border-[#FFA000] shadow-[0_0_12px_#FFA000]"
                : "bg-slate-900 text-red-400 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
            }`}
          >
            {estado === 1 ? (
              <Flame className="h-5 w-5 fill-current animate-bounce" />
            ) : estado === 2 ? (
              <AlertTriangle className="h-5 w-5 fill-current" />
            ) : (
              <ShieldAlert className="h-5 w-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] uppercase tracking-wider text-slate-300">
                MOTOR DE DECISÃO ANALÍTICA
              </span>
              <span className="text-[9px] text-white/40">·</span>
              <span className="font-mono text-[9px] text-cyan-400">
                Janela 30 Rodadas ({totalRodadasJanela}/30)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs sm:text-sm font-black uppercase tracking-wide ${accentTextClass}`}>
                {decisao.badge}
              </span>
            </div>
          </div>
        </div>

        {/* Telemetria do Hit Rate da Janela */}
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1 text-right">
            <span className="block text-[8px] font-mono uppercase text-white/60">Hit Rate Padrões</span>
            <span className={`font-mono text-xs sm:text-sm font-black ${hitRate30 >= 60 ? "text-[#00FF66]" : hitRate30 >= 40 ? "text-[#FFA000]" : "text-red-400"}`}>
              {hitRate30}%
            </span>
          </div>

          <span
            className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] font-black uppercase shadow-sm ${accentBadgeBg}`}
          >
            ESTADO {estado}
          </span>
        </div>
      </div>

      {/* =========================================================================
          MENSAGEM PRINCIPAL DO SINAL (ESTADOS 1, 2 OU 3 CONFORME ESPECIFICAÇÃO)
          ========================================================================= */}
      <div className="relative z-10 mt-3 rounded-xl border border-white/10 bg-black/75 p-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 shrink-0">
            {estado === 1 && <span className="inline-block h-3 w-3 rounded-full bg-[#00FF66] animate-ping" />}
            {estado === 2 && <span className="inline-block h-3 w-3 rounded-full bg-[#FFA000] animate-pulse" />}
            {estado === 3 && <span className="inline-block h-3 w-3 rounded-full bg-red-500/70" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className={`text-sm sm:text-base font-black tracking-wide leading-snug drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] ${
                estado === 1
                  ? "text-[#00FF66] drop-shadow-[0_0_10px_rgba(0,255,102,0.8)]"
                  : estado === 2
                  ? "text-[#FFA000] drop-shadow-[0_0_8px_rgba(255,160,0,0.8)]"
                  : "text-white/80"
              }`}
            >
              {decisao.mensagem}
            </h3>
            <p className="mt-1 text-[10px] sm:text-[11px] text-white/70 font-mono leading-relaxed">
              {decisao.subtitulo}
            </p>
          </div>
        </div>

        {/* NÚMEROS ALVOS EM DESTAQUE (CHIPS COM CORES REAIS DA ROLETA) */}
        {decisao.alvosNumeros.length > 0 && (
          <div className="mt-3 border-t border-white/10 pt-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-white/70">
                Alvos Recomendados ({decisao.alvosNumeros.length} Números):
              </span>
              {estado === 1 && decisao.numerosIntersecao.length > 0 && (
                <span className="font-mono text-[9px] font-black text-[#00FF66]">
                  ⚡ 4 Números de Intersecção: {decisao.numerosIntersecao.join(", ")}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {decisao.alvosNumeros.slice(0, 16).map((num) => {
                const isIntersecao = decisao.numerosIntersecao.includes(num);
                const cor = corDoNumero(num);

                return (
                  <button
                    key={`dec-target-${num}`}
                    type="button"
                    onClick={() => onSelectNumber?.(num)}
                    title={`Número ${num} (${isIntersecao ? "Intersecção Principal" : "Alvo de Cobertura"})`}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg font-display text-xs font-black text-white shadow transition-all hover:scale-115 cursor-pointer ${
                      isIntersecao
                        ? "ring-2 ring-[#00FF66] shadow-[0_0_12px_rgba(0,255,102,0.8)] scale-105"
                        : ""
                    }`}
                    style={{
                      background: cor,
                      border:
                        cor === "#000000"
                          ? "1.5px solid #FFFFFF"
                          : isIntersecao
                          ? "2px solid #00FF66"
                          : "1px solid rgba(255, 255, 255, 0.4)",
                    }}
                  >
                    {num}
                  </button>
                );
              })}
              {decisao.alvosNumeros.length > 16 && (
                <span className="rounded bg-black/60 px-2 py-1 font-mono text-[9px] text-white/60 border border-white/10">
                  +{decisao.alvosNumeros.length - 16} outros
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MÓDULO UNIFICADO: ÍNDICE DE CONFIANÇA MATEMÁTICA & CURVA TÉRMICA (CHART.JS)
          ========================================================================= */}
      <div className="relative z-10 mt-3">
        <DecisionEngineSparkline
          curva={decisao.curvaTermica}
          estado={estado}
          confiancaPerc={confiancaPerc}
          hitRate30={hitRate30}
          height={76}
        />
      </div>

      {/* =========================================================================
          SMART BUTTONS ('GREEN' E 'RED') LINKADOS À GESTÃO OPERACIONAL E ROI
          ========================================================================= */}
      <div className="relative z-10 mt-3 rounded-xl border border-white/10 bg-black/85 p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="font-bold text-white/80">Validação Operacional:</span>
            {lastValidation && (
              <span
                className={`rounded px-1.5 py-0.2 text-[8.5px] font-black uppercase ${
                  lastValidation === "GREEN"
                    ? "bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]"
                    : "bg-red-500/20 text-red-300 border border-red-500"
                }`}
              >
                Última: {lastValidation}
              </span>
            )}
          </div>

          {/* Telemetria de ROI em tempo real alimentada pelos Smart Buttons */}
          <div className="flex items-center gap-2.5 font-mono text-[9px]">
            <span className="text-white/60">
              ROI Sessão:{" "}
              <strong
                className={`font-black ${
                  sessao.roiSessaoPerc >= 0 ? "text-[#00FF66]" : "text-red-400"
                }`}
              >
                {sessao.roiSessaoPerc >= 0 ? `+${sessao.roiSessaoPerc}%` : `${sessao.roiSessaoPerc}%`}
              </strong>
            </span>
            <span className="text-white/40">·</span>
            <span className="text-white/60">
              Lucro:{" "}
              <strong className={sessao.lucroLiquidoSessao >= 0 ? "text-[#00FF66]" : "text-red-400"}>
                {sessao.lucroLiquidoSessao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </strong>
            </span>
          </div>
        </div>

        {/* Grade dos Botões Smart Green & Red */}
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {/* BOTÃO GREEN */}
          <button
            type="button"
            disabled={isProcessingAction}
            onClick={() => handleValidarResultado("GREEN")}
            className="group relative flex items-center justify-center gap-2 rounded-xl border-2 border-[#00FF66] bg-emerald-950/70 py-2 sm:py-2.5 font-display text-xs sm:text-sm font-black uppercase text-[#00FF66] shadow-[0_0_14px_rgba(0,255,102,0.35)] transition-all hover:bg-[#00FF66] hover:text-black hover:shadow-[0_0_24px_#00FF66] active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4 transition-transform group-hover:scale-125" />
            <span>VALIDAR GREEN</span>
            <span className="rounded bg-black/60 px-1.5 py-0.2 font-mono text-[9px] font-bold text-white group-hover:text-black">
              {estado === 1 ? "+200%" : estado === 2 ? "+50%" : "+100%"}
            </span>
          </button>

          {/* BOTÃO RED */}
          <button
            type="button"
            disabled={isProcessingAction}
            onClick={() => handleValidarResultado("RED")}
            className="group relative flex items-center justify-center gap-2 rounded-xl border-2 border-red-500 bg-rose-950/70 py-2 sm:py-2.5 font-display text-xs sm:text-sm font-black uppercase text-red-300 shadow-[0_0_14px_rgba(239,68,68,0.35)] transition-all hover:bg-red-600 hover:text-white hover:shadow-[0_0_24px_#EF4444] active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <XCircle className="h-4 w-4 transition-transform group-hover:scale-125" />
            <span>COMPUTAR RED</span>
            <span className="rounded bg-black/60 px-1.5 py-0.2 font-mono text-[9px] font-bold text-white">
              -1x
            </span>
          </button>
        </div>

        {/* Placar de Entradas e Atalho de Banca */}
        <div className="mt-2 flex items-center justify-between font-mono text-[8.5px] text-white/60 pt-1">
          <div className="flex items-center gap-2">
            <span>Greens: <strong className="text-[#00FF66]">{sessao.greensTotais}</strong></span>
            <span>Reds: <strong className="text-red-400">{sessao.redsTotais}</strong></span>
            <span>Giros: <strong className="text-white">{sessao.totalGirosOperados}</strong></span>
          </div>

          {onOpenBankrollTab && (
            <button
              type="button"
              onClick={onOpenBankrollTab}
              className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Gestão de Banca</span>
              <ArrowRight className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
