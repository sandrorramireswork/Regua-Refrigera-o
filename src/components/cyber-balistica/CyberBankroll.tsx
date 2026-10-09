import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  TrendingUp,
  AlertOctagon,
  Sparkles,
  Plus,
  Minus,
  Flame,
  ShieldCheck,
  ShieldAlert,
  Percent,
  Cpu,
} from "lucide-react";
import type { ToastType } from "./CyberEffects";
import {
  calcularHalfKelly,
  type KellyCalculationResult,
  type TipoApostaKelly,
  type PoissonAnalysisResult,
} from "@/lib/three-tier-engine";

interface CyberBankrollProps {
  onTriggerToast: (toast: { type: ToastType; title: string; message: string }) => void;
  onTriggerGreenG1: () => void;
  poissonAnalysis?: PoissonAnalysisResult | undefined;
  calcularKelly?: (
    bancaAtual: number,
    tipoAposta?: TipoApostaKelly,
    stopLoss?: number,
    unidadeMinima?: number
  ) => KellyCalculationResult;
}

export function CyberBankroll({
  onTriggerToast,
  onTriggerGreenG1,
  poissonAnalysis,
  calcularKelly: calcularKellyProp,
}: CyberBankrollProps) {
  // Estados da Gestão Financeira
  const [bancaInicial, setBancaInicial] = useState<number>(1000);
  const [bancaAtual, setBancaAtual] = useState<number>(1000);
  const [stopWin, setStopWin] = useState<number>(1300);
  const [stopLoss, setStopLoss] = useState<number>(800);
  const [valorUnidade, setValorUnidade] = useState<number>(25);

  // Estados do Critério de Half-Kelly
  const [tipoKelly, setTipoKelly] = useState<TipoApostaKelly>("DUZIA_COLUNA");
  const [autoSyncKelly, setAutoSyncKelly] = useState<boolean>(false);

  // Estado de Gale para Gamificação (Regra do Green no G1)
  const [galeLevel, setGaleLevel] = useState<number>(0);

  // Monitorar se alertas já foram disparados na sessão
  const [notifiedWin, setNotifiedWin] = useState<boolean>(false);
  const [notifiedLoss, setNotifiedLoss] = useState<boolean>(false);

  // Cálculo de ROI em tempo real
  const lucroAbsoluto = bancaAtual - bancaInicial;
  const roiPerc = bancaInicial > 0 ? (lucroAbsoluto / bancaInicial) * 100 : 0;

  // Margem segura até o Stop-Loss
  const margemStopLoss = Math.max(0, bancaAtual - stopLoss);

  // Executa o cálculo de Half-Kelly com o peso de Poisson ativo
  const kelly: KellyCalculationResult = useMemo(() => {
    if (calcularKellyProp) {
      return calcularKellyProp(bancaAtual, tipoKelly, stopLoss, 1.0);
    }
    const pesoPoisson = poissonAnalysis?.maiorPesoKelly.peso ?? 1.0;
    return calcularHalfKelly(bancaAtual, tipoKelly, pesoPoisson, stopLoss, 1.0);
  }, [calcularKellyProp, bancaAtual, tipoKelly, stopLoss, poissonAnalysis]);

  // Sincronização automática do Half-Kelly com o valor da ficha se ativado
  useEffect(() => {
    if (autoSyncKelly && kelly.stakeSugeridaFinal > 0) {
      setValorUnidade(kelly.stakeSugeridaFinal);
    }
  }, [autoSyncKelly, kelly.stakeSugeridaFinal]);

  // Verificação contínua de Stop-Win e Stop-Loss
  useEffect(() => {
    if (bancaAtual >= stopWin && !notifiedWin) {
      setNotifiedWin(true);
      onTriggerToast({
        type: "STOP_WIN",
        title: "META STOP-WIN ATINGIDA!",
        message: `Parabéns! Banca atingiu R$ ${bancaAtual.toFixed(2)} (+${roiPerc.toFixed(1)}% ROI). Recomenda-se encerrar a sessão.`,
      });
    } else if (bancaAtual < stopWin && notifiedWin) {
      setNotifiedWin(false);
    }

    if (bancaAtual <= stopLoss && !notifiedLoss) {
      setNotifiedLoss(true);
      onTriggerToast({
        type: "STOP_LOSS",
        title: "LIMITE STOP-LOSS ATINGIDO!",
        message: `ALERTA DE SEGURANÇA: Banca atingiu R$ ${bancaAtual.toFixed(2)} (${roiPerc.toFixed(1)}% ROI). Pare imediatamente!`,
      });
    } else if (bancaAtual > stopLoss && notifiedLoss) {
      setNotifiedLoss(false);
    }
  }, [bancaAtual, stopWin, stopLoss, roiPerc, notifiedWin, notifiedLoss, onTriggerToast]);

  // Aplicação da Stake Sugerida pelo Half-Kelly
  const handleApplyKellyStake = () => {
    if (kelly.stakeSugeridaFinal > 0) {
      setValorUnidade(kelly.stakeSugeridaFinal);
      onTriggerToast({
        type: "GENERIC",
        title: "HALF-KELLY APLICADO",
        message: `Ficha atualizada para R$ ${kelly.stakeSugeridaFinal.toFixed(2)} (Trava Stop-Loss: R$ ${margemStopLoss.toFixed(2)}).`,
      });
    }
  };

  // AÇÃO: + WIN (Cyan)
  const handleWin = () => {
    if (galeLevel === 1) {
      onTriggerGreenG1();
      onTriggerToast({
        type: "GREEN_G1",
        title: "GREEN NO G1 CONFIRMADO!",
        message: "Celebração tática ativada! Recuperação perfeita na primeira entrada de Gale.",
      });
    }

    const multiplicador = Math.pow(2, galeLevel);
    const ganho = valorUnidade * multiplicador;
    setBancaAtual((prev) => prev + ganho);
    setGaleLevel(0);
  };

  // AÇÃO: - LOSS (Vermelho)
  const handleLoss = () => {
    const multiplicador = Math.pow(2, galeLevel);
    const perda = valorUnidade * multiplicador;
    setBancaAtual((prev) => Math.max(0, prev - perda));
    setGaleLevel((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0d0f12] p-4 shadow-xl font-mono">
      {/* CABEÇALHO DA GESTÃO DE BANCA */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-[#08f7fe]" />
          <h3 className="text-xs sm:text-sm font-black uppercase text-white tracking-wider">
            GESTÃO DE BANCA & STOP LIMITS
          </h3>
        </div>

        {/* INDICADOR VISUAL DO GALE LEVEL */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#8892b0] uppercase font-bold">STATUS GALE:</span>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase border transition-all ${
              galeLevel === 0
                ? "border-emerald-500/50 bg-emerald-950/40 text-[#00ff88]"
                : galeLevel === 1
                ? "border-[#08f7fe] bg-[#08f7fe]/20 text-[#08f7fe] shadow-[0_0_12px_#08f7fe] animate-pulse"
                : "border-[#ff003c] bg-[#ff003c]/20 text-[#ff003c] shadow-[0_0_12px_#ff003c]"
            }`}
          >
            <Flame className="h-3 w-3" />
            {galeLevel === 0
              ? "G0 (ENTRADA BASE)"
              : galeLevel === 1
              ? "G1 (GATILHO DE CELEBRAÇÃO ATIVO)"
              : `G${galeLevel} (ALERTA ELEVADO)`}
          </span>
        </div>
      </div>

      {/* PAINEL DE TELEMETRIA: BANCA ATUAL & ROI EM TEMPO REAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-white/10 bg-black/60 p-3">
          <span className="text-[10px] font-black uppercase text-[#8892b0] block">
            BANCA ATUAL
          </span>
          <span className="text-2xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]">
            R$ {bancaAtual.toFixed(2)}
          </span>
          <div className="mt-1 flex items-center justify-between text-[10px] text-[#8892b0]">
            <span>Inicial: R$ {bancaInicial.toFixed(2)}</span>
            <span className="text-[#08f7fe] font-bold">Ficha: R$ {valorUnidade.toFixed(2)}</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/60 p-3">
          <span className="text-[10px] font-black uppercase text-[#8892b0] block">
            ROI EM TEMPO REAL
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-black drop-shadow-[0_0_10px_currentColor] ${
                roiPerc >= 0 ? "text-[#08f7fe]" : "text-[#ff003c]"
              }`}
            >
              {roiPerc >= 0 ? `+${roiPerc.toFixed(1)}%` : `${roiPerc.toFixed(1)}%`}
            </span>
            <span
              className={`text-xs font-bold ${
                lucroAbsoluto >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              ({lucroAbsoluto >= 0 ? `+R$ ${lucroAbsoluto.toFixed(2)}` : `-R$ ${Math.abs(lucroAbsoluto).toFixed(2)}`})
            </span>
          </div>
          <span className="text-[10px] text-[#8892b0] mt-1 block">
            Rendimento acumulado da sessão
          </span>
        </div>
      </div>

      {/* INPUTS DARK MINIMALISTAS (BANCA, STOP-WIN, STOP-LOSS, FICHA) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-[#8892b0]">
            Banca Inicial
          </label>
          <input
            type="number"
            value={bancaInicial}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              setBancaInicial(val);
            }}
            className="w-full rounded-lg border border-white/10 bg-[#050507] px-2 py-1.5 text-xs font-bold text-white focus:border-[#08f7fe] focus:outline-none focus:ring-1 focus:ring-[#08f7fe]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-[#08f7fe] flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-[#08f7fe]" />
            Meta Stop-Win
          </label>
          <input
            type="number"
            value={stopWin}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              setStopWin(val);
            }}
            className="w-full rounded-lg border border-[#08f7fe]/40 bg-[#050507] px-2 py-1.5 text-xs font-bold text-[#08f7fe] focus:border-[#08f7fe] focus:outline-none focus:ring-1 focus:ring-[#08f7fe]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-[#ff003c] flex items-center gap-1">
            <AlertOctagon className="h-3 w-3 text-[#ff003c]" />
            Limite Stop-Loss
          </label>
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              setStopLoss(val);
            }}
            className="w-full rounded-lg border border-[#ff003c]/40 bg-[#050507] px-2 py-1.5 text-xs font-bold text-[#ff003c] focus:border-[#ff003c] focus:outline-none focus:ring-1 focus:ring-[#ff003c]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-[#00FF88] flex items-center gap-1">
            <Percent className="h-3 w-3 text-[#00FF88]" />
            Valor Ficha (R$)
          </label>
          <input
            type="number"
            step="0.5"
            value={valorUnidade}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              setValorUnidade(val);
            }}
            className="w-full rounded-lg border border-[#00FF88]/40 bg-[#050507] px-2 py-1.5 text-xs font-bold text-[#00FF88] focus:border-[#00FF88] focus:outline-none focus:ring-1 focus:ring-[#00FF88]"
          />
        </div>
      </div>

      {/* =========================================================================
          DIMENSIONAMENTO DE POSIÇÃO: HALF-KELLY & TRAVA DE STOP-LOSS
          ========================================================================= */}
      <div className="rounded-xl border border-cyan-500/30 bg-black/40 p-3 mt-1">
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 border-b border-white/10 pb-1.5">
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-[#08f7fe]" />
            <span className="text-[11px] font-black uppercase tracking-wider text-white">
              MOTOR HALF-KELLY (GESTÃO DE RISCO)
            </span>
          </div>

          {/* Toggle tipo de aposta Kelly: Dúzia/Coluna (b=2) vs Pleno (b=35) */}
          <div className="flex items-center rounded-lg bg-black/70 p-0.5 border border-white/10 text-[9px] font-bold">
            <button
              type="button"
              onClick={() => setTipoKelly("DUZIA_COLUNA")}
              className={`px-2 py-0.5 rounded transition ${
                tipoKelly === "DUZIA_COLUNA"
                  ? "bg-[#08f7fe]/20 text-[#08f7fe] font-black border border-[#08f7fe]/60"
                  : "text-[#8892b0] hover:text-white"
              }`}
            >
              Dúzia/Coluna (b=2)
            </button>
            <button
              type="button"
              onClick={() => setTipoKelly("PLENO")}
              className={`px-2 py-0.5 rounded transition ${
                tipoKelly === "PLENO"
                  ? "bg-[#08f7fe]/20 text-[#08f7fe] font-black border border-[#08f7fe]/60"
                  : "text-[#8892b0] hover:text-white"
              }`}
            >
              Pleno (b=35)
            </button>
          </div>
        </div>

        {/* MÉTRICAS KELLY */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] mb-2">
          <div className="rounded-lg bg-black/60 p-2 border border-white/5">
            <span className="text-[#8892b0] block text-[9px]">STAKE HALF-KELLY</span>
            <span className="text-base font-black text-[#00FF88] drop-shadow-[0_0_8px_#00FF88]">
              R$ {kelly.stakeSugeridaFinal.toFixed(2)}
            </span>
            <span className="text-[9px] text-[#8892b0] block">
              {(kelly.halfKellyFracao * 100).toFixed(1)}% banca
            </span>
          </div>

          <div className="rounded-lg bg-black/60 p-2 border border-white/5">
            <span className="text-[#8892b0] block text-[9px]">MARGEM STOP-LOSS</span>
            <span
              className={`text-base font-black ${
                margemStopLoss > 0 ? "text-white" : "text-[#ff003c]"
              }`}
            >
              R$ {margemStopLoss.toFixed(2)}
            </span>
            <span className="text-[9px] text-[#8892b0] block">Trava rigorosa</span>
          </div>

          <div className="rounded-lg bg-black/60 p-2 border border-white/5">
            <span className="text-[#8892b0] block text-[9px]">PROB. AJUSTADA (p)</span>
            <span className="text-base font-black text-[#08f7fe]">
              {(kelly.probabilidadeAjustada * 100).toFixed(1)}%
            </span>
            <span className="text-[9px] text-[#8892b0] block">
              Poisson: {kelly.pesoPoisson}x
            </span>
          </div>

          <div className="rounded-lg bg-black/60 p-2 border border-white/5">
            <span className="text-[#8892b0] block text-[9px]">EDGE MATEMÁTICO</span>
            <span
              className={`text-base font-black ${
                kelly.edgeMatematico > 0 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {kelly.edgeMatematico > 0 ? `+${(kelly.edgeMatematico * 100).toFixed(1)}%` : `${(kelly.edgeMatematico * 100).toFixed(1)}%`}
            </span>
            <span className="text-[9px] text-[#8892b0] block">
              Multiplicador: {kelly.multiplicador}x
            </span>
          </div>
        </div>

        {/* STATUS DO STOP-LOSS & BOTÃO DE APLICAÇÃO */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
          <div className="text-[10px] text-[#8892b0] flex items-center gap-1.5">
            {bancaAtual <= stopLoss ? (
              <span className="text-[#ff003c] font-black flex items-center gap-1">
                <AlertOctagon className="h-3.5 w-3.5" />
                TRAVA ATIVADA: Banca no Stop-Loss! Entradas bloqueadas.
              </span>
            ) : valorUnidade > margemStopLoss ? (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                Ficha manual (R$ {valorUnidade}) excede margem até Stop-Loss (R$ {margemStopLoss.toFixed(2)})!
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                {kelly.statusDescricao}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[10px] text-[#8892b0] cursor-pointer">
              <input
                type="checkbox"
                checked={autoSyncKelly}
                onChange={(e) => setAutoSyncKelly(e.target.checked)}
                className="rounded border-white/20 bg-black text-[#08f7fe] focus:ring-0 cursor-pointer"
              />
              <span>Auto-vincular</span>
            </label>

            <button
              type="button"
              onClick={handleApplyKellyStake}
              disabled={kelly.stakeSugeridaFinal <= 0 || bancaAtual <= stopLoss}
              className="rounded-lg border border-[#08f7fe]/60 bg-[#08f7fe]/15 px-2.5 py-1 text-[10px] font-black uppercase text-[#08f7fe] hover:bg-[#08f7fe]/30 active:scale-95 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_8px_rgba(8,247,254,0.3)]"
            >
              Aplicar Sugestão (R$ {kelly.stakeSugeridaFinal.toFixed(2)})
            </button>
          </div>
        </div>
      </div>

      {/* BOTÕES TÁTICOS DE AÇÃO: + WIN (Cyan) E - LOSS (Vermelho) */}
      <div className="grid grid-cols-2 gap-3 mt-1.5">
        <button
          type="button"
          onClick={handleWin}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#08f7fe] bg-[#08f7fe]/15 text-sm sm:text-base font-black uppercase text-[#08f7fe] transition-all hover:scale-104 hover:bg-[#08f7fe]/30 active:scale-96 cursor-pointer shadow-[0_0_18px_rgba(8,247,254,0.65),inset_0_0_8px_rgba(8,247,254,0.25)] hover:shadow-[0_0_28px_rgba(8,247,254,0.9)]"
        >
          <Plus className="h-4 w-4" />
          <span>+ WIN</span>
        </button>

        <button
          type="button"
          onClick={handleLoss}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#ff003c] bg-[#ff003c]/15 text-sm sm:text-base font-black uppercase text-[#ff003c] transition-all hover:scale-104 hover:bg-[#ff003c]/30 active:scale-96 cursor-pointer shadow-[0_0_18px_rgba(255,0,60,0.65),inset_0_0_8px_rgba(255,0,60,0.25)] hover:shadow-[0_0_28px_rgba(255,0,60,0.9)]"
        >
          <Minus className="h-4 w-4" />
          <span>- LOSS</span>
        </button>
      </div>
    </div>
  );
}
