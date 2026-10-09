import { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Target,
  CheckCircle2,
  Percent,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Sliders,
  RotateCcw,
  Check,
  Zap,
  Lock,
  Unlock,
  Activity,
  ShieldAlert,
  Flame,
  LineChart as LineChartIcon,
  Link as LinkIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { GraficoGestaoBanca } from "@/components/roleta/GraficoGestaoBanca";
import type { SmartBankrollAnalysis, SmartBankrollConfig } from "@/lib/smart-bankroll";
import {
  type GestaoSetupConfig,
  type RegistroDiario,
  DEFAULT_GESTAO_SETUP,
  loadGestaoSetup,
  saveGestaoSetup,
  loadRegistrosManuais,
  saveRegistrosManuais,
  calcularTabelaAcompanhamento,
  calcularMetricasExecutivas,
  calcularCompatibilidadeTravas,
  formatarMoeda,
  formatarPerc,
} from "@/lib/gestao-banca-inteligente";
import { useGestaoOperacional } from "@/hooks/useGestaoOperacional";
import type { SistemaProgressao, TipoEntradaGatilho } from "@/lib/gestao-operacional-engine";
import { REDS } from "@/lib/roulette";

interface Props {
  config: SmartBankrollConfig;
  analysis: SmartBankrollAnalysis;
  onChange: (next: SmartBankrollConfig) => void;
  onIniciarOutroDia?: () => void;
  spinsCount?: number;
}

const STOP_WIN_PRESETS = [3, 5, 8, 10, 15];
const STOP_LOSS_PRESETS = [5, 10, 15, 20];

export function TabGestaoBanca({
  config,
  analysis,
  onChange,
  onIniciarOutroDia,
  spinsCount = 0,
}: Props) {
  // Estado do Plano Executivo de Juros Compostos
  const [gestaoConfig, setGestaoConfig] = useState<GestaoSetupConfig>(DEFAULT_GESTAO_SETUP);
  const [registrosManuais, setRegistrosManuais] = useState<Record<number, number | null>>({});
  const [feedbackSalvo, setFeedbackSalvo] = useState(false);
  const [feedbackNovoDia, setFeedbackNovoDia] = useState(false);

  // Integração com o Motor Operacional do Teclado (Martingale & D'Alembert)
  const gestaoOperacional = useGestaoOperacional();
  const {
    config: opConfig,
    sessao: opSessao,
    alvoAtual: opAlvo,
    updateConfig: updateOpConfig,
    resetarSessao: resetarOpSessao,
    desbloquearTrava: desbloquearOpTrava,
  } = gestaoOperacional;

  // Carregar dados salvos no primeiro render
  useEffect(() => {
    setGestaoConfig(loadGestaoSetup());
    setRegistrosManuais(loadRegistrosManuais());
  }, []);

  // Atualizar e persistir configurações de setup do plano
  const updateSetup = (partial: Partial<GestaoSetupConfig>) => {
    const next: GestaoSetupConfig = { ...gestaoConfig, ...partial };
    setGestaoConfig(next);
    saveGestaoSetup(next);
    mostrarFeedback();
  };

  // Atualizar entrada manual de um dia específico (recálculo em cascata)
  const handleUpdateDiaFinal = (dia: number, valorRaw: string) => {
    const nextRegistros = { ...registrosManuais };
    const limpo = valorRaw.trim().replace(",", ".");
    if (limpo === "") {
      delete nextRegistros[dia];
    } else {
      const num = parseFloat(limpo);
      if (!isNaN(num)) {
        nextRegistros[dia] = Math.max(0, num);
      }
    }
    setRegistrosManuais(nextRegistros);
    saveRegistrosManuais(nextRegistros);
  };

  // Limpar registro de um dia específico
  const handleLimparDia = (dia: number) => {
    const nextRegistros = { ...registrosManuais };
    delete nextRegistros[dia];
    setRegistrosManuais(nextRegistros);
    saveRegistrosManuais(nextRegistros);
  };

  // Ação de Simular Meta Teórica para os dias do plano
  const handleSimularMetaTeorica = () => {
    const diasTotais = Math.min(60, Math.max(1, gestaoConfig.diasOperacao));
    const nextRegistros: Record<number, number | null> = {};
    const taxaFracao = gestaoConfig.taxaJurosDiaria / 100;

    for (let d = 1; d <= diasTotais; d++) {
      const projetado = gestaoConfig.bancaInicial * Math.pow(1 + taxaFracao, d);
      nextRegistros[d] = Number(projetado.toFixed(2));
    }
    setRegistrosManuais(nextRegistros);
    saveRegistrosManuais(nextRegistros);
    mostrarFeedback();
  };

  // Resetar todos os registros diários
  const handleResetarRegistros = () => {
    if (window.confirm("Deseja realmente limpar todos os registros manuais da tabela?")) {
      setRegistrosManuais({});
      saveRegistrosManuais({});
      mostrarFeedback();
    }
  };

  const mostrarFeedback = () => {
    setFeedbackSalvo(true);
    setTimeout(() => setFeedbackSalvo(false), 1800);
  };

  // Cálculo reativo da tabela em cascata
  const tabela = useMemo(() => {
    return calcularTabelaAcompanhamento(gestaoConfig, registrosManuais);
  }, [gestaoConfig, registrosManuais]);

  // Cálculo dos KPIs executivos e métricas avançadas
  const kpis = useMemo(() => {
    return calcularMetricasExecutivas(gestaoConfig, tabela);
  }, [gestaoConfig, tabela]);

  // Capital base ativo da gestão (último saldo conhecido ou banca atual da sessão)
  const bancaBase = useMemo(() => {
    if (kpis.bancaAtualReal > 0) return kpis.bancaAtualReal;
    if (analysis.currentBankroll > 0) return analysis.currentBankroll;
    return config.bankroll > 0 ? config.bankroll : gestaoConfig.bancaInicial;
  }, [kpis.bancaAtualReal, analysis.currentBankroll, config.bankroll, gestaoConfig.bancaInicial]);

  // Valores compatíveis calculados para Stop Win e Stop Loss
  const travasCompat = useMemo(() => {
    return calcularCompatibilidadeTravas(gestaoConfig, bancaBase);
  }, [gestaoConfig, bancaBase]);

  // =========================================================================
  // SISTEMA DE SINCRONIZAÇÃO CONJUNTA E COMPATÍVEL DE STOP WIN & STOP LOSS
  // =========================================================================

  // Alteração conjunta do Stop Win (em % ou em R$)
  const handleUpdateStopWinConjunto = (tipo: "percent" | "valor", valor: number, ativo?: boolean) => {
    const isAtivo = ativo !== undefined ? ativo : gestaoConfig.stopWinAtivo;
    const base = Math.max(1, bancaBase);
    let valorReais = 0;
    let valorPerc = 0;

    if (tipo === "percent") {
      valorPerc = Math.max(0, valor);
      valorReais = Math.round(base * (valorPerc / 100) * 100) / 100;
    } else {
      valorReais = Math.max(0, valor);
      valorPerc = Math.round(((valorReais / base) * 100) * 100) / 100;
    }

    // 1. Atualiza configuração do plano diário
    const nextGestao: GestaoSetupConfig = {
      ...gestaoConfig,
      stopWinAtivo: isAtivo,
      stopWinTipo: tipo,
      stopWinValor: valor,
    };
    setGestaoConfig(nextGestao);
    saveGestaoSetup(nextGestao);

    // 2. Atualiza a sessão operacional simultaneamente com valor compatível
    onChange({
      ...config,
      stopWinEnabled: isAtivo,
      dailyTarget: valorReais,
    });

    // 3. Sincroniza com o motor operacional do teclado
    updateOpConfig({
      stopWinValor: valorReais,
      stopWinAtivo: isAtivo,
    });

    mostrarFeedback();
  };

  // Alteração conjunta do Stop Loss (em % ou em R$)
  const handleUpdateStopLossConjunto = (tipo: "percent" | "valor", valor: number, ativo?: boolean) => {
    const isAtivo = ativo !== undefined ? ativo : gestaoConfig.stopLossAtivo;
    const base = Math.max(1, bancaBase);
    let valorReais = 0;
    let valorPerc = 0;

    if (tipo === "percent") {
      valorPerc = Math.max(0, valor);
      valorReais = Math.round(base * (valorPerc / 100) * 100) / 100;
    } else {
      valorReais = Math.max(0, valor);
      valorPerc = Math.round(((valorReais / base) * 100) * 100) / 100;
    }

    // 1. Atualiza configuração do plano diário
    const nextGestao: GestaoSetupConfig = {
      ...gestaoConfig,
      stopLossAtivo: isAtivo,
      stopLossTipo: tipo,
      stopLossValor: valor,
    };
    setGestaoConfig(nextGestao);
    saveGestaoSetup(nextGestao);

    // 2. Atualiza a sessão operacional simultaneamente com valor compatível
    onChange({
      ...config,
      stopLossEnabled: isAtivo,
      stopLoss: valorReais,
    });

    // 3. Sincroniza com o motor operacional do teclado
    updateOpConfig({
      stopLossValor: valorReais,
      stopLossAtivo: isAtivo,
    });

    mostrarFeedback();
  };

  // Toggle conjunto Stop Win
  const handleToggleStopWinConjunto = (ativo: boolean) => {
    handleUpdateStopWinConjunto(gestaoConfig.stopWinTipo, gestaoConfig.stopWinValor, ativo);
  };

  // Toggle conjunto Stop Loss
  const handleToggleStopLossConjunto = (ativo: boolean) => {
    handleUpdateStopLossConjunto(gestaoConfig.stopLossTipo, gestaoConfig.stopLossValor, ativo);
  };

  // FUNÇÃO CENTRAL: INICIAR OUTRO DIA E SEMPRE ZERAR O BLOQUEIO
  const handleIniciarOutroDiaCompleto = () => {
    const today = new Date().toISOString().slice(0, 10);
    const novaBancaBase = bancaBase;

    // Recalcula as metas monetárias da sessão compatíveis com a nova banca base
    const travasAtualizadas = calcularCompatibilidadeTravas(gestaoConfig, novaBancaBase);

    // Zera o bloqueio e reinicia os giros da nova sessão
    const nextConfig: SmartBankrollConfig = {
      ...config,
      bankroll: novaBancaBase,
      dailyTarget: travasAtualizadas.stopWinReais,
      stopLoss: travasAtualizadas.stopLossReais,
      sessionStartIndex: spinsCount,
      sessionDate: today,
      lockdownCleared: true,
    };

    onChange(nextConfig);

    if (onIniciarOutroDia) {
      onIniciarOutroDia();
    }

    setFeedbackNovoDia(true);
    setTimeout(() => setFeedbackNovoDia(false), 2500);
  };

  // Métricas do Dimensionamento Operacional da Sessão
  const isLockdown = analysis.lockdown !== null;
  const metaAlcancadaOperacional = config.dailyTarget > 0 && analysis.profit >= config.dailyTarget;
  const percMetaOperacional = config.dailyTarget > 0
    ? Math.min(100, Math.max(0, (analysis.profit / config.dailyTarget) * 100))
    : 0;
  const perdaAtualOperacional = Math.max(0, -analysis.profit);
  const percPerdaOperacional = config.stopLoss > 0
    ? Math.min(100, (perdaAtualOperacional / config.stopLoss) * 100)
    : 0;

  // Distância restante para a meta
  const distanciaStopWin = Math.max(0, config.dailyTarget - analysis.profit);
  const toleranciaStopLoss = Math.max(0, config.stopLoss - perdaAtualOperacional);

  return (
    <div className="space-y-4">
      {/* 1. TOP BAR EXECUTIVA: TÍTULO, STATUS DO BLOQUEIO E BOTÃO DE ZERAR / INICIAR OUTRO DIA */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg border border-neon-gold/50 bg-neon-gold/10 p-2 text-neon-gold shadow-[0_0_12px_rgba(250,204,21,0.3)]">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-sm font-black tracking-wider text-neon-gold flex items-center gap-2">
              GESTÃO DE BANCA INTELIGENTE
              <span className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[9px] font-sans font-bold text-neon-cyan">
                EXECUTIVE TERMINAL
              </span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Sincronização conjunta de Stop-Win/Loss, controle estrito de drawdown e projeção de juros compostos
            </p>
          </div>
        </div>

        {/* STATUS DO BLOQUEIO & BOTÃO INICIAR NOVO DIA */}
        <div className="flex flex-wrap items-center gap-2">
          {feedbackNovoDia && (
            <span className="flex items-center gap-1 text-[11px] font-black text-neon-green animate-bounce">
              <Check className="h-3.5 w-3.5" /> Novo Dia Iniciado · Bloqueio Zerado!
            </span>
          )}

          {/* INDICADOR DE STATUS DO BLOQUEIO */}
          {isLockdown ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-500/10 px-2.5 py-1 text-xs font-black text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse">
              <Lock className="h-3.5 w-3.5" />
              {analysis.lockdown === "win" ? "BLOQUEIO ATIVO (STOP-WIN BATIDO) 🎯" : "BLOQUEIO ATIVO (STOP-LOSS ATINGIDO) 🛑"}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
              <Unlock className="h-3.5 w-3.5" />
              OPERAÇÃO LIBERADA (SEM BLOQUEIO)
            </div>
          )}

          {/* BOTÃO EXCLUSIVO: SEMPRE ZERAR BLOQUEIO AO INICIAR OUTRO DIA */}
          <button
            onClick={handleIniciarOutroDiaCompleto}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all shadow-md cursor-pointer ${
              isLockdown
                ? "border border-neon-gold/60 bg-neon-gold/20 text-neon-gold hover:bg-neon-gold/30 shadow-[0_0_15px_rgba(250,204,21,0.4)] animate-pulse"
                : "border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 shadow-[0_0_10px_rgba(0,229,255,0.25)]"
            }`}
            title="Zera o bloqueio e os lucros acumulados da sessão, iniciando a contagem de um novo dia"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Iniciar Outro Dia (Zerar Bloqueio)
          </button>
        </div>
      </div>

      {/* 2. CARD INTEGRADO: DIMENSIONAMENTO DA SESSÃO AO VIVO & CONTROLE CONJUNTO DE TRAVAS */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md shadow-xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="rounded-md border border-neon-cyan/50 bg-neon-cyan/10 p-1.5 text-neon-cyan">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-xs font-bold tracking-wider text-white flex items-center gap-2">
                DIMENSIONAMENTO DA SESSÃO AO VIVO & GATILHOS CONJUNTOS
                <span className="rounded-full border border-neon-gold/40 bg-neon-gold/10 px-2 py-0.2 text-[9px] font-mono text-neon-gold flex items-center gap-1">
                  <LinkIcon className="h-2.5 w-2.5" /> Travas Vinculadas à Banca
                </span>
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Slots Kelly proporcionais e parametrização sincronizada de Stop-Win e Stop-Loss (Sessão ⇄ Plano)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-medium">Saldo da Sessão Atual:</span>
            <span
              className={`font-mono text-xs font-black px-2.5 py-0.5 rounded border ${
                analysis.profit >= 0
                  ? "border-emerald-500/30 bg-emerald-500/10 text-[#00E676]"
                  : "border-rose-500/30 bg-rose-500/10 text-[#FF1744]"
              }`}
            >
              {analysis.profit >= 0 ? "+" : ""}{formatarMoeda(analysis.profit)}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* SLOT ENTRADA NORMAL (1%) */}
          <div className="rounded-lg border border-neon-orange/40 bg-black/40 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1 text-neon-orange">
                <Zap className="h-3 w-3" />
                ENTRADA PADRÃO · 1%
              </span>
              <span className="text-[9px] text-muted-foreground">Alvos Puxada</span>
            </div>
            <div className="mt-1.5 text-base font-mono font-black text-neon-orange">
              {formatarMoeda(analysis.standardSuggestion)}
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">1% da banca ativa de {formatarMoeda(bancaBase)}</p>
          </div>

          {/* SLOT SUPER CONFLUÊNCIA (2.5%) */}
          <div className="rounded-lg border border-neon-cyan/40 bg-black/40 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1 text-neon-cyan">
                <Sparkles className="h-3 w-3" />
                SUPER CONFLUÊNCIA · 2,5%
              </span>
              <span className="text-[9px] text-muted-foreground">2+ Motores</span>
            </div>
            <div className="mt-1.5 text-base font-mono font-black text-neon-cyan">
              {formatarMoeda(analysis.superSuggestion)}
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">Alavancagem de alta assertividade (95%+)</p>
          </div>

          {/* CONTROLE UNIFICADO E CONJUNTO: STOP-WIN */}
          <div className="rounded-lg border border-white/[0.08] bg-black/40 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="flex items-center gap-1 text-neon-green">
                <Target className="h-3 w-3" />
                STOP-WIN (SESSÃO & PLANO)
              </span>
              <div className="flex items-center gap-1">
                <span className={config.stopWinEnabled ? "text-neon-green text-[9px]" : "text-muted-foreground text-[9px]"}>
                  {config.stopWinEnabled ? "ATIVO" : "OFF"}
                </span>
                <Switch
                  checked={config.stopWinEnabled}
                  onCheckedChange={handleToggleStopWinConjunto}
                  className="data-[state=checked]:bg-[#00E676] h-4 w-7"
                />
              </div>
            </div>

            {/* INPUTS CONJUNTOS R$ E % */}
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <div className="rounded border border-white/10 bg-white/[0.02] px-1.5 py-0.5">
                <span className="text-[8px] text-muted-foreground uppercase block font-bold">Meta R$</span>
                <input
                  type="number"
                  step="any"
                  value={travasCompat.stopWinReais}
                  onChange={(e) => handleUpdateStopWinConjunto("valor", Math.max(0, Number(e.target.value) || 0))}
                  disabled={!config.stopWinEnabled}
                  className="w-full bg-transparent text-xs font-mono font-black text-white focus:outline-none disabled:opacity-40"
                />
              </div>
              <div className="rounded border border-white/10 bg-white/[0.02] px-1.5 py-0.5">
                <span className="text-[8px] text-muted-foreground uppercase block font-bold">Meta %</span>
                <div className="flex items-center justify-between">
                  <input
                    type="number"
                    step="0.5"
                    value={travasCompat.stopWinPerc}
                    onChange={(e) => handleUpdateStopWinConjunto("percent", Math.max(0, Number(e.target.value) || 0))}
                    disabled={!config.stopWinEnabled}
                    className="w-full bg-transparent text-xs font-mono font-black text-neon-green focus:outline-none disabled:opacity-40"
                  />
                  <span className="text-[10px] text-neon-green font-bold">%</span>
                </div>
              </div>
            </div>

            {/* PRESETS DE 1-CLIQUE */}
            <div className="mt-1.5 flex items-center justify-between gap-1">
              <span className="text-[8px] text-muted-foreground">Presets:</span>
              <div className="flex items-center gap-1">
                {STOP_WIN_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleUpdateStopWinConjunto("percent", p, true)}
                    className={`rounded px-1 py-0.2 text-[8px] font-bold border transition-colors ${
                      Math.abs(travasCompat.stopWinPerc - p) < 0.1 && config.stopWinEnabled
                        ? "border-[#00E676] bg-[#00E676]/20 text-[#00E676]"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white"
                    }`}
                  >
                    +{p}%
                  </button>
                ))}
              </div>
            </div>

            {/* BARRA DE PROGRESSO DO STOP WIN */}
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full transition-all duration-500 ${
                    metaAlcancadaOperacional
                      ? "bg-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.8)]"
                      : "bg-[#00E676]/70"
                  }`}
                  style={{ width: `${percMetaOperacional}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
                <span>{percMetaOperacional.toFixed(0)}% batido</span>
                <span>Faltam {formatarMoeda(distanciaStopWin)}</span>
              </div>
            </div>
          </div>

          {/* CONTROLE UNIFICADO E CONJUNTO: STOP-LOSS */}
          <div className="rounded-lg border border-white/[0.08] bg-black/40 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="flex items-center gap-1 text-neon-red">
                <AlertTriangle className="h-3 w-3" />
                STOP-LOSS (SESSÃO & PLANO)
              </span>
              <div className="flex items-center gap-1">
                <span className={config.stopLossEnabled ? "text-neon-red text-[9px]" : "text-muted-foreground text-[9px]"}>
                  {config.stopLossEnabled ? "ATIVO" : "OFF"}
                </span>
                <Switch
                  checked={config.stopLossEnabled}
                  onCheckedChange={handleToggleStopLossConjunto}
                  className="data-[state=checked]:bg-[#FF1744] h-4 w-7"
                />
              </div>
            </div>

            {/* INPUTS CONJUNTOS R$ E % */}
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <div className="rounded border border-white/10 bg-white/[0.02] px-1.5 py-0.5">
                <span className="text-[8px] text-muted-foreground uppercase block font-bold">Limite R$</span>
                <input
                  type="number"
                  step="any"
                  value={travasCompat.stopLossReais}
                  onChange={(e) => handleUpdateStopLossConjunto("valor", Math.max(0, Number(e.target.value) || 0))}
                  disabled={!config.stopLossEnabled}
                  className="w-full bg-transparent text-xs font-mono font-black text-white focus:outline-none disabled:opacity-40"
                />
              </div>
              <div className="rounded border border-white/10 bg-white/[0.02] px-1.5 py-0.5">
                <span className="text-[8px] text-muted-foreground uppercase block font-bold">Limite %</span>
                <div className="flex items-center justify-between">
                  <input
                    type="number"
                    step="0.5"
                    value={travasCompat.stopLossPerc}
                    onChange={(e) => handleUpdateStopLossConjunto("percent", Math.max(0, Number(e.target.value) || 0))}
                    disabled={!config.stopLossEnabled}
                    className="w-full bg-transparent text-xs font-mono font-black text-neon-red focus:outline-none disabled:opacity-40"
                  />
                  <span className="text-[10px] text-neon-red font-bold">%</span>
                </div>
              </div>
            </div>

            {/* PRESETS DE 1-CLIQUE */}
            <div className="mt-1.5 flex items-center justify-between gap-1">
              <span className="text-[8px] text-muted-foreground">Presets:</span>
              <div className="flex items-center gap-1">
                {STOP_LOSS_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleUpdateStopLossConjunto("percent", p, true)}
                    className={`rounded px-1 py-0.2 text-[8px] font-bold border transition-colors ${
                      Math.abs(travasCompat.stopLossPerc - p) < 0.1 && config.stopLossEnabled
                        ? "border-[#FF1744] bg-[#FF1744]/20 text-[#FF1744]"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white"
                    }`}
                  >
                    -{p}%
                  </button>
                ))}
              </div>
            </div>

            {/* BARRA DE PROGRESSO DO STOP LOSS */}
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full transition-all duration-500 ${
                    percPerdaOperacional >= 100
                      ? "bg-[#FF1744] shadow-[0_0_8px_rgba(255,23,68,0.8)]"
                      : percPerdaOperacional >= 60
                      ? "bg-neon-gold"
                      : "bg-neon-gold/50"
                  }`}
                  style={{ width: `${percPerdaOperacional}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
                <span>{percPerdaOperacional.toFixed(0)}% consumido</span>
                <span>Tolerância {formatarMoeda(toleranciaStopLoss)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NOVO: MOTOR DE ENTRADA DO TECLADO & SISTEMAS DE PROGRESSÃO (MARTINGALE & D'ALEMBERT EXPERT) */}
      <div className="rounded-xl border border-neon-green/30 bg-black/50 p-4 backdrop-blur-md shadow-[0_0_25px_rgba(0,255,136,0.06)] relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-neon-green/10 blur-2xl pointer-events-none" />

        {/* HEADER DO MOTOR OPERACIONAL */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-neon-green/40 bg-neon-green/10 shadow-[0_0_12px_rgba(0,255,136,0.25)]">
              <Zap className="h-4 w-4 text-neon-green animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-black tracking-wider text-white uppercase">
                  Motor de Entrada do Teclado & Progressão Expert
                </h3>
                <span className="rounded-full border border-neon-green/40 bg-neon-green/10 px-2 py-0.5 text-[9px] font-black text-neon-green uppercase tracking-wider">
                  Sincronizado com Teclado
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Gatilho visual "ACIONAR ENTRADA", cálculo progressivo em tempo real e travas de segurança
              </p>
            </div>
          </div>

          {/* TELEMETRIA RÁPIDA DA SESSÃO */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={`rounded-lg border px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1.5 ${
              opSessao.lucroLiquidoSessao > 0
                ? "border-neon-green/40 bg-neon-green/10 text-neon-green shadow-[0_0_8px_rgba(0,255,136,0.2)]"
                : opSessao.lucroLiquidoSessao < 0
                ? "border-neon-red/40 bg-neon-red/10 text-neon-red shadow-[0_0_8px_rgba(255,23,68,0.2)]"
                : "border-white/10 bg-white/[0.03] text-muted-foreground"
            }`}>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">P&L Teclado:</span>
              <span>{opSessao.lucroLiquidoSessao >= 0 ? "+" : ""}{formatarMoeda(opSessao.lucroLiquidoSessao)}</span>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1 text-[10px] font-mono text-muted-foreground flex items-center gap-2">
              <span>Greens: <strong className="text-neon-green">{opSessao.greensTotais}</strong></span>
              <span>Reds: <strong className="text-neon-red">{opSessao.redsTotais}</strong></span>
              <span>Win Rate: <strong className="text-white">{opSessao.totalEntradasAcionadas > 0 ? ((opSessao.greensTotais / opSessao.totalEntradasAcionadas) * 100).toFixed(0) : 0}%</strong></span>
            </div>

            {/* AVISOS DE TRAVA SE ATIVOS */}
            {opSessao.statusTrava === "META_ALCANCADA" && (
              <button
                onClick={desbloquearOpTrava}
                className="flex items-center gap-1 rounded-md border border-neon-gold bg-neon-gold/20 px-2 py-1 text-[10px] font-bold text-neon-gold hover:bg-neon-gold/30 transition-all cursor-pointer shadow-[0_0_8px_rgba(255,215,0,0.3)]"
                title="Meta de Stop-Win alcançada! Clique para desbloquear novas operações voluntariamente"
              >
                <Unlock className="h-3 w-3" />
                Desbloquear Meta
              </button>
            )}

            {opSessao.statusTrava === "STOP_LOSS_ATINGIDO" && (
              <button
                onClick={desbloquearOpTrava}
                className="flex items-center gap-1 rounded-md border border-neon-red bg-neon-red/20 px-2 py-1 text-[10px] font-bold text-neon-red hover:bg-neon-red/30 transition-all cursor-pointer shadow-[0_0_8px_rgba(255,23,68,0.3)]"
                title="Stop-Loss atingido! Clique para desbloquear com cautela"
              >
                <Unlock className="h-3 w-3" />
                Desbloquear Stop-Loss
              </button>
            )}

            <button
              onClick={() => resetarOpSessao()}
              className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Zerar estatísticas e P&L da sessão do teclado"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Sessão
            </button>
          </div>
        </div>

        {/* 1. SELEÇÃO DO SISTEMA DE PROGRESSÃO */}
        <div className="mb-4">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
            <Activity className="h-3 w-3 text-neon-green" />
            Sistema de Progressão Financeira
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* MARTINGALE */}
            <button
              onClick={() => updateOpConfig({ sistema: "MARTINGALE" })}
              className={`rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                opConfig.sistema === "MARTINGALE"
                  ? "border-neon-green bg-neon-green/10 shadow-[0_0_12px_rgba(0,255,136,0.18)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-white">Martingale</span>
                {opConfig.sistema === "MARTINGALE" && (
                  <span className="h-2 w-2 rounded-full bg-neon-green animate-ping" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">
                Dobra em Red (<strong className="text-white">2x</strong>), reseta a G0 no Green. Recuperação imediata.
              </p>
              <div className="mt-2 text-[9px] font-mono text-neon-green font-bold">
                Max Gales: {opConfig.maxGales} | G0..G{opConfig.maxGales}
              </div>
            </button>

            {/* D'ALEMBERT CLÁSSICO */}
            <button
              onClick={() => updateOpConfig({ sistema: "DALEMBERT_CLASSICO" })}
              className={`rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                opConfig.sistema === "DALEMBERT_CLASSICO"
                  ? "border-neon-cyan bg-neon-cyan/10 shadow-[0_0_12px_rgba(0,229,255,0.18)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-white">D'Alembert Clássico</span>
                {opConfig.sistema === "DALEMBERT_CLASSICO" && (
                  <span className="h-2 w-2 rounded-full bg-neon-cyan animate-ping" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">
                Pirâmide suave: <strong className="text-neon-red">+1 un</strong> no Red, <strong className="text-neon-green">-1 un</strong> no Green. Piso em 1 un.
              </p>
              <div className="mt-2 text-[9px] font-mono text-neon-cyan font-bold">
                Unidade: {formatarMoeda(opConfig.unidadeDalembert)} | Teto: N{opConfig.tetoNivelDalembert}
              </div>
            </button>

            {/* D'ALEMBERT REVERSO */}
            <button
              onClick={() => updateOpConfig({ sistema: "DALEMBERT_REVERSO" })}
              className={`rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                opConfig.sistema === "DALEMBERT_REVERSO"
                  ? "border-neon-gold bg-neon-gold/10 shadow-[0_0_12px_rgba(255,215,0,0.18)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-white">D'Alembert Reverso</span>
                {opConfig.sistema === "DALEMBERT_REVERSO" && (
                  <span className="h-2 w-2 rounded-full bg-neon-gold animate-ping" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">
                Contra-D'Alembert: <strong className="text-neon-green">+1 un</strong> no Green, <strong className="text-neon-red">-1 un</strong> no Red. Surfa sequências vitoriosas.
              </p>
              <div className="mt-2 text-[9px] font-mono text-neon-gold font-bold">
                Unidade: {formatarMoeda(opConfig.unidadeDalembert)} | Teto: N{opConfig.tetoNivelDalembert}
              </div>
            </button>

            {/* D'ALEMBERT ADAPTATIVO */}
            <button
              onClick={() => updateOpConfig({ sistema: "DALEMBERT_ADAPTATIVO" })}
              className={`rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                opConfig.sistema === "DALEMBERT_ADAPTATIVO"
                  ? "border-[#E040FB] bg-[#E040FB]/10 shadow-[0_0_12px_rgba(224,64,251,0.22)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-white">D'Alembert Adaptativo</span>
                {opConfig.sistema === "DALEMBERT_ADAPTATIVO" && (
                  <span className="h-2 w-2 rounded-full bg-[#E040FB] animate-ping" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">
                Expert Analítico: Pondera confluência de score, fecha ciclos antecipadamente e trava drawdowns de cauda.
              </p>
              <div className="mt-2 text-[9px] font-mono text-[#E040FB] font-bold">
                Algoritmo Inteligente & Reset Dinâmico
              </div>
            </button>
          </div>
        </div>

        {/* 2. CONFIGURAÇÃO DE ENTRADA APLICADA & MODOS DE MERCADO */}
        <div className="space-y-3">
          {/* PAINEL PRINCIPAL DE SELEÇÃO DE MERCADO */}
          <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-neon-green" />
                <div>
                  <h4 className="font-display text-xs font-black tracking-wider text-white uppercase">
                    Modos de Mercado & Entrada Aplicada (Gatilho)
                  </h4>
                  <p className="text-[9.5px] text-muted-foreground">
                    Selecione o mercado da rodada. O sistema calcula automaticamente os payouts, lucros e coberturas.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-neon-green/10 border border-neon-green/30 px-2 py-0.5 text-[9px] font-mono font-bold text-neon-green">
                  {opAlvo.nome} ({opAlvo.coberturaPercentual}% mesa)
                </span>
                <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-mono text-muted-foreground">
                  {opAlvo.retornoEstimadoTexto}
                </span>
              </div>
            </div>

            {/* SELETOR DE MODOS DE MERCADO (8 MERCADOS) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {[
                { id: "duzia" as const, label: "Dúzia", badge: "2:1", payout: "+200%" },
                { id: "coluna" as const, label: "Coluna", badge: "2:1", payout: "+200%" },
                { id: "duzia_coluna" as const, label: "Dúzia+Coluna", badge: "Cruzada", payout: "Duplo/Parcial" },
                { id: "cor" as const, label: "Cor", badge: "1:1", payout: "+100%" },
                { id: "par_impar" as const, label: "Par / Ímpar", badge: "1:1", payout: "+100%" },
                { id: "maior_menor" as const, label: "Maior / Menor", badge: "1:1", payout: "+100%" },
                { id: "mercado_numeros" as const, label: "Números", badge: "Até 35:1", payout: "Pleno/Setor" },
                { id: "personalizado" as const, label: "Personalizado", badge: "Livre", payout: "Dinâmico" },
              ].map((m) => {
                const isSelected = opConfig.tipoEntrada === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      let defaultAlvo: number | string = 1;
                      if (m.id === "duzia") defaultAlvo = 1;
                      else if (m.id === "coluna") defaultAlvo = 1;
                      else if (m.id === "duzia_coluna") defaultAlvo = "1_1";
                      else if (m.id === "cor") defaultAlvo = "vermelho";
                      else if (m.id === "par_impar") defaultAlvo = "par";
                      else if (m.id === "maior_menor") defaultAlvo = "menor";
                      else if (m.id === "mercado_numeros") defaultAlvo = "pleno:17";
                      else if (m.id === "personalizado") defaultAlvo = "0, 32, 15, 19, 4, 21, 2";
                      updateOpConfig({ tipoEntrada: m.id, alvoEntrada: defaultAlvo });
                    }}
                    className={`rounded-lg p-2 text-left transition-all cursor-pointer border ${
                      isSelected
                        ? "border-neon-green bg-neon-green/15 text-white shadow-[0_0_10px_rgba(0,255,136,0.2)]"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5 min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight truncate">{m.label}</span>
                      <span className={`text-[7px] sm:text-[7.5px] font-bold px-1 py-0.2 rounded shrink-0 ${
                        isSelected ? "bg-neon-green text-black" : "bg-white/10 text-muted-foreground"
                      }`}>
                        {m.badge}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono text-neon-green block font-bold truncate">{m.payout}</span>
                  </button>
                );
              })}
            </div>

            {/* SUB-CONTROLES PARA CADA MERCADO ATIVO */}
            <div className="rounded-lg border border-white/5 bg-black/50 p-2.5 mb-3">
              {/* 1. SUB-CONTROLE: DÚZIA SIMPLES */}
              {opConfig.tipoEntrada === "duzia" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-[9px] text-muted-foreground">
                    <span>SELECIONE A DÚZIA ALVO (PAGA 2:1 | LUCRO LÍQUIDO +200%):</span>
                    <span className="text-neon-green font-bold font-mono">12 Números · 32.4% da mesa</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 1, label: "1ª Dúzia", sub: "Números 1 a 12" },
                      { id: 2, label: "2ª Dúzia", sub: "Números 13 a 24" },
                      { id: 3, label: "3ª Dúzia", sub: "Números 25 a 36" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => updateOpConfig({ alvoEntrada: d.id })}
                        className={`rounded-lg p-2 text-left transition-all border cursor-pointer ${
                          Number(opConfig.alvoEntrada) === d.id
                            ? "border-neon-green bg-neon-green/20 text-white shadow-[0_0_10px_rgba(0,255,136,0.3)]"
                            : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white"
                        }`}
                      >
                        <div className="text-xs font-black text-white">{d.label}</div>
                        <div className="text-[9px] text-muted-foreground font-mono">{d.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. SUB-CONTROLE: COLUNA SIMPLES */}
              {opConfig.tipoEntrada === "coluna" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-[9px] text-muted-foreground">
                    <span>SELECIONE A COLUNA ALVO (PAGA 2:1 | LUCRO LÍQUIDO +200%):</span>
                    <span className="text-neon-cyan font-bold font-mono">12 Números · 32.4% da mesa</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 1, label: "1ª Coluna", sub: "1, 4, 7...34" },
                      { id: 2, label: "2ª Coluna", sub: "2, 5, 8...35" },
                      { id: 3, label: "3ª Coluna", sub: "3, 6, 9...36" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => updateOpConfig({ alvoEntrada: c.id })}
                        className={`rounded-lg p-2 text-left transition-all border cursor-pointer ${
                          Number(opConfig.alvoEntrada) === c.id
                            ? "border-neon-cyan bg-neon-cyan/20 text-white shadow-[0_0_10px_rgba(0,229,255,0.3)]"
                            : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white"
                        }`}
                      >
                        <div className="text-xs font-black text-white">{c.label}</div>
                        <div className="text-[9px] text-muted-foreground font-mono">{c.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. SUB-CONTROLE: DÚZIA + COLUNA (CRUZADA / CONFLUÊNCIA) */}
              {opConfig.tipoEntrada === "duzia_coluna" && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-2 text-[9px] text-muted-foreground">
                    <span>COBERTURA CRUZADA (DIVIDIDA EM 2 PERNAS: 50% DÚZIA / 50% COLUNA):</span>
                    <span className="text-neon-gold font-bold font-mono">
                      Total 20 Números (54.1% mesa) · 4 Duplos (+200%) · 16 Parciais (+50%)
                    </span>
                  </div>

                  {/* PRESETS DE COMBINAÇÃO RÁPIDA */}
                  <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 mb-2">
                    {[
                      { id: "1_1", label: "D1 + C1" },
                      { id: "1_2", label: "D1 + C2" },
                      { id: "1_3", label: "D1 + C3" },
                      { id: "2_1", label: "D2 + C1" },
                      { id: "2_2", label: "D2 + C2" },
                      { id: "2_3", label: "D2 + C3" },
                      { id: "3_1", label: "D3 + C1" },
                      { id: "3_2", label: "D3 + C2" },
                      { id: "3_3", label: "D3 + C3" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => updateOpConfig({ alvoEntrada: p.id })}
                        className={`rounded px-1 py-1.5 text-[9.5px] font-black uppercase border transition cursor-pointer ${
                          String(opConfig.alvoEntrada) === p.id
                            ? "border-neon-gold bg-neon-gold/20 text-neon-gold shadow-[0_0_8px_rgba(255,215,0,0.4)]"
                            : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[8px] text-muted-foreground">
                    Ao cair nos 4 números de interseção, você vence em ambas (lucro líquido de +200%). Ao cair nas outras 16 casas, vence em uma e perde na outra (lucro líquido de +50%).
                  </p>
                </div>
              )}

              {/* 4. SUB-CONTROLE: COR (VERMELHO / PRETO) */}
              {opConfig.tipoEntrada === "cor" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-[9px] text-muted-foreground">
                    <span>CHANCE SIMPLES: COR (PAGA 1:1 | LUCRO LÍQUIDO +100%):</span>
                    <span className="text-white font-bold font-mono">18 Números · 48.6% da mesa</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => updateOpConfig({ alvoEntrada: "vermelho" })}
                      className={`rounded-lg p-2.5 text-center transition-all border cursor-pointer ${
                        String(opConfig.alvoEntrada).toLowerCase() === "vermelho"
                          ? "border-[#FF003C] bg-[#FF003C]/25 text-white shadow-[0_0_12px_rgba(255,0,60,0.5)] scale-[1.01]"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-[#FF003C] shadow-[0_0_8px_#FF003C]" />
                        <span className="font-display text-sm font-black text-white uppercase">Vermelho (Red)</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground block mt-1">18 Números Vermelhos</span>
                    </button>

                    <button
                      onClick={() => updateOpConfig({ alvoEntrada: "preto" })}
                      className={`rounded-lg p-2.5 text-center transition-all border cursor-pointer ${
                        String(opConfig.alvoEntrada).toLowerCase() === "preto"
                          ? "border-white bg-white/15 text-white shadow-[0_0_12px_rgba(255,255,255,0.4)] scale-[1.01]"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-black border border-white" />
                        <span className="font-display text-sm font-black text-white uppercase">Preto (Black)</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground block mt-1">18 Números Pretos</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 5. SUB-CONTROLE: PAR OU ÍMPAR */}
              {opConfig.tipoEntrada === "par_impar" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-[9px] text-muted-foreground">
                    <span>CHANCE SIMPLES: PAR / ÍMPAR (PAGA 1:1 | LUCRO LÍQUIDO +100%):</span>
                    <span className="text-white font-bold font-mono">18 Números · 48.6% da mesa</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => updateOpConfig({ alvoEntrada: "par" })}
                      className={`rounded-lg p-2.5 text-center transition-all border cursor-pointer ${
                        String(opConfig.alvoEntrada).toLowerCase() === "par"
                          ? "border-neon-cyan bg-neon-cyan/20 text-white shadow-[0_0_12px_rgba(0,229,255,0.4)] scale-[1.01]"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white"
                      }`}
                    >
                      <div className="font-display text-sm font-black text-neon-cyan uppercase">Pares (Even)</div>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">2, 4, 6, 8... 36</span>
                    </button>

                    <button
                      onClick={() => updateOpConfig({ alvoEntrada: "impar" })}
                      className={`rounded-lg p-2.5 text-center transition-all border cursor-pointer ${
                        String(opConfig.alvoEntrada).toLowerCase() === "impar"
                          ? "border-neon-gold bg-neon-gold/20 text-white shadow-[0_0_12px_rgba(255,215,0,0.4)] scale-[1.01]"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white"
                      }`}
                    >
                      <div className="font-display text-sm font-black text-neon-gold uppercase">Ímpares (Odd)</div>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">1, 3, 5, 7... 35</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 6. SUB-CONTROLE: MAIOR OU MENOR */}
              {opConfig.tipoEntrada === "maior_menor" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-[9px] text-muted-foreground">
                    <span>CHANCE SIMPLES: MAIOR / MENOR (PAGA 1:1 | LUCRO LÍQUIDO +100%):</span>
                    <span className="text-white font-bold font-mono">18 Números · 48.6% da mesa</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => updateOpConfig({ alvoEntrada: "menor" })}
                      className={`rounded-lg p-2.5 text-center transition-all border cursor-pointer ${
                        String(opConfig.alvoEntrada).toLowerCase() === "menor"
                          ? "border-neon-cyan bg-neon-cyan/20 text-white shadow-[0_0_12px_rgba(0,229,255,0.4)] scale-[1.01]"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white"
                      }`}
                    >
                      <div className="font-display text-sm font-black text-neon-cyan uppercase">Menor (1 a 18)</div>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">18 Números Baixos</span>
                    </button>

                    <button
                      onClick={() => updateOpConfig({ alvoEntrada: "maior" })}
                      className={`rounded-lg p-2.5 text-center transition-all border cursor-pointer ${
                        String(opConfig.alvoEntrada).toLowerCase() === "maior"
                          ? "border-neon-orange bg-neon-orange/20 text-white shadow-[0_0_12px_rgba(255,109,0,0.4)] scale-[1.01]"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white"
                      }`}
                    >
                      <div className="font-display text-sm font-black text-neon-orange uppercase">Maior (19 a 36)</div>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">18 Números Altos</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 7. SUB-CONTROLE: MERCADO DE NÚMEROS (PLENO, CAVALO, RUA, QUADRADO, SEISENA, SETORES) */}
              {opConfig.tipoEntrada === "mercado_numeros" && (
                <div>
                  <div className="flex items-center justify-between mb-2 text-[9px] text-muted-foreground">
                    <span>MERCADO DE NÚMEROS & APOSTAS INTERNAS / SETORES:</span>
                    <span className="text-neon-cyan font-bold font-mono">Payouts de 35:1 até 5:1</span>
                  </div>

                  {/* PRESETS DE SUBTIPOS */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2.5">
                    {[
                      { id: "pleno:17", label: "Pleno 17", badge: "35:1" },
                      { id: "pleno:0", label: "Zero (0)", badge: "35:1" },
                      { id: "cavalo:17,20", label: "Cavalo 17/20", badge: "17:1" },
                      { id: "rua:1", label: "Rua 1-3", badge: "11:1" },
                      { id: "quadrado:1", label: "Quad 1-5", badge: "8:1" },
                      { id: "seisena:1", label: "Seisena 1-6", badge: "5:1" },
                      { id: "setor:tiers", label: "Setor Tiers", badge: "2:1" },
                      { id: "setor:voisins", label: "Setor Voisins", badge: "1.4:1" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => updateOpConfig({ alvoEntrada: s.id })}
                        className={`rounded px-1.5 py-1 text-[9px] font-bold border transition cursor-pointer ${
                          String(opConfig.alvoEntrada) === s.id
                            ? "border-neon-cyan bg-neon-cyan/20 text-neon-cyan shadow-[0_0_8px_rgba(0,229,255,0.3)]"
                            : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white"
                        }`}
                      >
                        <div>{s.label}</div>
                        <span className="text-[7.5px] opacity-75 font-mono">{s.badge}</span>
                      </button>
                    ))}
                  </div>

                  {/* SELEÇÃO LIVRE DE NÚMERO PLENO (0 A 36) */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
                    <span className="text-[8.5px] text-muted-foreground font-bold">Pleno Rápido:</span>
                    {[0, 17, 20, 32, 15, 26, 11, 28].map((n) => (
                      <button
                        key={n}
                        onClick={() => updateOpConfig({ alvoEntrada: `pleno:${n}` })}
                        className={`h-5 w-5 rounded text-[8.5px] font-bold font-mono border transition ${
                          String(opConfig.alvoEntrada) === `pleno:${n}`
                            ? "border-neon-green bg-neon-green text-black"
                            : "border-white/10 bg-black/60 text-white hover:border-white"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 8. SUB-CONTROLE: PERSONALIZADO */}
              {opConfig.tipoEntrada === "personalizado" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-[9px] text-muted-foreground">
                    <span>DIGITE OS NÚMEROS DO SEU ALVO PERSONALIZADO:</span>
                    <span className="text-neon-gold font-bold font-mono">Calcula payout proporcional por ficha</span>
                  </div>
                  <input
                    type="text"
                    value={String(opConfig.alvoEntrada)}
                    onChange={(e) => updateOpConfig({ alvoEntrada: e.target.value })}
                    placeholder="Ex: 0, 32, 15, 19, 4, 21, 2"
                    className="w-full rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-xs font-mono text-white focus:border-neon-gold focus:outline-none mb-1.5"
                  />
                  <div className="flex flex-wrap items-center gap-1 text-[8.5px] text-muted-foreground">
                    <span>Presets rápidos:</span>
                    <button
                      onClick={() => updateOpConfig({ alvoEntrada: "0, 32, 15, 19, 4, 21, 2" })}
                      className="rounded border border-white/10 px-1.5 py-0.5 hover:text-white"
                    >
                      Vizinhos do Zero (Curto)
                    </button>
                    <button
                      onClick={() => updateOpConfig({ alvoEntrada: "1, 11, 21, 31" })}
                      className="rounded border border-white/10 px-1.5 py-0.5 hover:text-white"
                    >
                      Final 1
                    </button>
                    <button
                      onClick={() => updateOpConfig({ alvoEntrada: "7, 17, 27" })}
                      className="rounded border border-white/10 px-1.5 py-0.5 hover:text-white"
                    >
                      Final 7
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* CÁLCULO AUTOMÁTICO DO LUCRO & FÓRMULA DE GESTÃO */}
            <div className="rounded-lg border border-neon-green/30 bg-black/60 p-3 shadow-[0_0_15px_rgba(0,255,136,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-neon-green" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neon-green">
                    Fórmula de Gestão & Cálculo Automático do Lucro
                  </span>
                </div>
                <span className="rounded bg-neon-green/10 border border-neon-green/30 px-2 py-0.5 text-[9px] font-mono font-bold text-neon-green">
                  {opAlvo.formulaExplicativa}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2.5 text-center">
                <div className="rounded border border-white/10 bg-white/[0.02] p-2">
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground block">Aposta da Rodada</span>
                  <strong className="text-white font-mono text-sm font-black">{formatarMoeda(opConfig.valorEntradaInicial)}</strong>
                </div>

                <div className="rounded border border-neon-green/30 bg-neon-green/10 p-2">
                  <span className="text-[8px] uppercase tracking-wider text-neon-green block">Lucro Líquido (Green)</span>
                  <strong className="text-neon-green font-mono text-sm font-black">
                    {opAlvo.tipo === "duzia_coluna"
                      ? `+${formatarMoeda(opConfig.valorEntradaInicial * 2)}`
                      : `+${formatarMoeda(opConfig.valorEntradaInicial * opAlvo.multiplicadorPayout)}`}
                  </strong>
                  {opAlvo.tipo === "duzia_coluna" && (
                    <span className="text-[7.5px] text-neon-green/90 block">Parcial: +{formatarMoeda(opConfig.valorEntradaInicial * 0.5)}</span>
                  )}
                </div>

                <div className="rounded border border-cyan-400/30 bg-cyan-400/10 p-2">
                  <span className="text-[8px] uppercase tracking-wider text-cyan-400 block">Retorno Bruto Total</span>
                  <strong className="text-cyan-400 font-mono text-sm font-black">
                    {opAlvo.tipo === "duzia_coluna"
                      ? formatarMoeda(opConfig.valorEntradaInicial * 3)
                      : formatarMoeda(opConfig.valorEntradaInicial * (1 + opAlvo.multiplicadorPayout))}
                  </strong>
                  <span className="text-[7.5px] text-muted-foreground block">(Aposta + Lucro)</span>
                </div>

                <div className="rounded border border-white/10 bg-white/[0.02] p-2">
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground block">Cobertura da Mesa</span>
                  <strong className="text-white font-mono text-sm font-black">{opAlvo.coberturaPercentual}%</strong>
                  <span className="text-[7.5px] text-muted-foreground block">{opAlvo.numerosValidos.length} de 37 números</span>
                </div>
              </div>

              {/* PREVIEW DE NÚMEROS COM CORES REAIS DA ROLETA */}
              <div className="rounded border border-white/5 bg-black/70 p-2">
                <div className="flex items-center justify-between mb-1.5 text-[8.5px] text-muted-foreground">
                  <span>Números Cobertos no Mercado ({opAlvo.numerosValidos.length}):</span>
                  {opAlvo.tipo === "duzia_coluna" && (
                    <span className="text-neon-gold font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-neon-gold animate-ping" />
                      4 Números com Green Duplo (Interseção)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {opAlvo.numerosValidos.map((n) => {
                    const isDuplo = opAlvo.numerosDuplos?.includes(n);
                    const isZero = n === 0;
                    const isRed = REDS.includes(n);
                    let chipClass = "bg-[#000000] text-white border border-white/40";
                    if (isDuplo) {
                      chipClass = "bg-amber-500 text-black font-black border-2 border-neon-gold shadow-[0_0_10px_rgba(255,215,0,0.8)] scale-105";
                    } else if (isZero) {
                      chipClass = "bg-[#00E676] text-black font-black border border-[#00E676]";
                    } else if (isRed) {
                      chipClass = "bg-[#FF003C] text-white font-black border border-[#FF003C]";
                    }

                    return (
                      <span
                        key={n}
                        className={`inline-flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold font-mono transition-transform hover:scale-110 ${chipClass}`}
                        title={isDuplo ? `Número ${n}: GREEN DUPLO (+200% lucro)` : `Número ${n}`}
                      >
                        {n}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* GRID COM VALORES FINANCEIROS E PARÂMETROS DA PROGRESSÃO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* COLUNA 1: VALORES FINANCEIROS DE ENTRADA & TRAVAS */}
            <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3 flex flex-col justify-between">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-2">
                  <DollarSign className="h-3 w-3 text-neon-gold" />
                  Valor da Entrada Inicial & Travas de Gestão
                </label>

                {/* VALOR DA ENTRADA INICIAL */}
                <div className="rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5 focus-within:border-neon-green mb-2.5">
                  <span className="text-[9px] text-muted-foreground font-bold block">VALOR ENTRADA INICIAL (R$)</span>
                  <div className="flex items-center">
                    <span className="text-xs text-neon-green mr-1.5 font-bold">R$</span>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={opConfig.valorEntradaInicial}
                      onChange={(e) => updateOpConfig({ valorEntradaInicial: Math.max(0.5, Number(e.target.value) || 0.5) })}
                      className="w-full bg-transparent text-sm font-bold text-white focus:outline-none font-mono"
                      placeholder="5.00"
                    />
                  </div>
                </div>

                {/* EXIBIÇÃO SINCRONIZADA DAS METAS STOP-WIN / STOP-LOSS */}
                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                  <div className="rounded border border-neon-green/20 bg-neon-green/5 p-2">
                    <span className="text-muted-foreground block text-[8px]">META STOP-WIN:</span>
                    <strong className="text-neon-green font-bold text-sm">{formatarMoeda(opConfig.stopWinValor)}</strong>
                  </div>
                  <div className="rounded border border-neon-red/20 bg-neon-red/5 p-2">
                    <span className="text-muted-foreground block text-[8px]">LIMITE STOP-LOSS:</span>
                    <strong className="text-neon-red font-bold text-sm">{formatarMoeda(opConfig.stopLossValor)}</strong>
                  </div>
                </div>
              </div>

              <p className="mt-2 text-[8px] text-muted-foreground leading-tight">
                Os limites de Stop-Win e Stop-Loss são sincronizados automaticamente com os cards executivos de gestão de risco acima.
              </p>
            </div>

            {/* COLUNA 2: PARÂMETROS DA PROGRESSÃO ESPECÍFICA */}
            <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3">
              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-2">
                <Sliders className="h-3 w-3 text-neon-cyan" />
                Parâmetros: {opConfig.sistema.replace(/_/g, " ")}
              </label>

              {/* SE MARTINGALE */}
              {opConfig.sistema === "MARTINGALE" && (
                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold mb-1">
                      <span>MÁXIMO DE GALES:</span>
                      <span className="text-white font-mono text-xs">{opConfig.maxGales} Gales</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3, 4, 5].map((g) => (
                        <button
                          key={g}
                          onClick={() => updateOpConfig({ maxGales: g })}
                          className={`flex-1 rounded py-1 text-[10px] font-bold font-mono transition-all ${
                            opConfig.maxGales === g
                              ? "border border-neon-green bg-neon-green/20 text-neon-green shadow-[0_0_8px_rgba(0,255,136,0.3)]"
                              : "border border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white"
                          }`}
                        >
                          G{g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ESCADA DE VALORES PROJETADOS */}
                  <div className="rounded border border-white/5 bg-black/50 p-2 text-[9px] font-mono">
                    <span className="text-muted-foreground block text-[8px] mb-1">Escada de Exposição por Rodada:</span>
                    <div className="flex items-center justify-between text-white">
                      <span>G0: {formatarMoeda(opConfig.valorEntradaInicial)}</span>
                      {opConfig.maxGales >= 1 && <span>G1: {formatarMoeda(opConfig.valorEntradaInicial * 2)}</span>}
                      {opConfig.maxGales >= 2 && <span>G2: {formatarMoeda(opConfig.valorEntradaInicial * 4)}</span>}
                      {opConfig.maxGales >= 3 && <span>G3: {formatarMoeda(opConfig.valorEntradaInicial * 8)}</span>}
                    </div>
                    <div className="mt-1 pt-1 border-t border-white/5 flex items-center justify-between text-muted-foreground text-[8px]">
                      <span>Custo Total do Ciclo:</span>
                      <strong className="text-neon-red font-bold font-mono">
                        {formatarMoeda(opConfig.valorEntradaInicial * (Math.pow(2, opConfig.maxGales + 1) - 1))}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* SE D'ALEMBERT */}
              {opConfig.sistema !== "MARTINGALE" && (
                <div className="space-y-2.5">
                  {/* UNIDADE D'ALEMBERT */}
                  <div className="rounded-md border border-white/10 bg-white/[0.02] px-2 py-1">
                    <span className="text-[8px] text-muted-foreground font-bold block">UNIDADE DE DEGRAU (R$)</span>
                    <div className="flex items-center">
                      <span className="text-xs text-neon-cyan mr-1 font-bold">R$</span>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={opConfig.unidadeDalembert}
                        onChange={(e) => updateOpConfig({ unidadeDalembert: Math.max(0.5, Number(e.target.value) || 0.5) })}
                        className="w-full bg-transparent text-xs font-bold text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* TETO PIRÂMIDE */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold mb-1">
                      <span>TETO PIRÂMIDE (NÍVEL MÁX):</span>
                      <span className="text-white font-mono text-xs">Nível {opConfig.tetoNivelDalembert}</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="20"
                      step="1"
                      value={opConfig.tetoNivelDalembert}
                      onChange={(e) => updateOpConfig({ tetoNivelDalembert: Number(e.target.value) })}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-neon-cyan"
                    />
                    <div className="flex justify-between text-[8px] text-muted-foreground mt-0.5">
                      <span>Nível 3 (Ultra Seguro)</span>
                      <span>Nível 20 (Amplo)</span>
                    </div>
                  </div>

                  {/* RESET COM LUCRO POSITIVO */}
                  <div className="flex items-center justify-between rounded border border-white/5 bg-black/40 p-1.5">
                    <span className="text-[8px] text-muted-foreground">Reset Automático ao Lucrar</span>
                    <Switch
                      checked={Boolean(opConfig.resetarCicloComLucro ?? true)}
                      onCheckedChange={(checked) => updateOpConfig({ resetarCicloComLucro: checked })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. PAINEL DE CONFIGURAÇÃO DE SETUP GLOBAL DO PLANO */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md shadow-xl">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-neon-gold" />
            <h3 className="font-display text-xs font-bold tracking-wider text-white uppercase">
              Parâmetros Globais: Curva Exponencial de Juros Compostos
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {feedbackSalvo && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-neon-green animate-pulse">
                <Check className="h-3 w-3" /> Parâmetros Salvos
              </span>
            )}
            <button
              onClick={handleSimularMetaTeorica}
              className="flex items-center gap-1 rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-2.5 py-1 text-[10px] font-bold text-neon-cyan hover:bg-neon-cyan/20 transition-all shadow-[0_0_8px_rgba(0,229,255,0.2)] cursor-pointer"
              title="Preenche a coluna manual com a curva teórica para simulação rápida"
            >
              <Sparkles className="h-3 w-3" />
              Simular Meta Ideal
            </button>
            <button
              onClick={handleResetarRegistros}
              className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
              title="Limpar todos os inputs manuais da tabela"
            >
              <RotateCcw className="h-3 w-3" />
              Limpar Registros
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {/* BANCA INICIAL */}
          <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
            <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-neon-gold" />
              BANCA INICIAL (R$)
            </label>
            <div className="mt-1.5 flex items-center rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5 focus-within:border-neon-gold">
              <span className="text-xs text-muted-foreground mr-1.5 font-bold">R$</span>
              <input
                type="number"
                min="1"
                step="50"
                value={gestaoConfig.bancaInicial}
                onChange={(e) => updateSetup({ bancaInicial: Math.max(1, Number(e.target.value) || 0) })}
                className="w-full bg-transparent text-sm font-bold text-white focus:outline-none font-mono"
                placeholder="1000.00"
              />
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">Capital base de partida no Dia 01</p>
          </div>

          {/* TAXA DE JUROS COMPOSTOS (%) */}
          <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
            <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3 text-neon-cyan" />
              META DIÁRIA (JUROS COMPOSTOS)
            </label>
            <div className="mt-1.5 flex items-center rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5 focus-within:border-neon-cyan">
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={gestaoConfig.taxaJurosDiaria}
                onChange={(e) => updateSetup({ taxaJurosDiaria: Math.max(0.1, Number(e.target.value) || 0) })}
                className="w-full bg-transparent text-sm font-bold text-white focus:outline-none font-mono"
                placeholder="2.0"
              />
              <span className="text-xs text-neon-cyan ml-1.5 font-bold">% / dia</span>
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">Crescimento exponencial planejado</p>
          </div>

          {/* TEMPO DE OPERAÇÃO (DIAS) */}
          <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-neon-orange" />
                TEMPO DE OPERAÇÃO
              </span>
              <span className="text-white font-mono font-bold text-xs">
                {gestaoConfig.diasOperacao} {gestaoConfig.diasOperacao === 1 ? "dia" : "dias"}
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <input
                type="range"
                min="5"
                max="60"
                step="1"
                value={gestaoConfig.diasOperacao}
                onChange={(e) => updateSetup({ diasOperacao: Number(e.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-neon-orange"
              />
              <input
                type="number"
                min="1"
                max="60"
                value={gestaoConfig.diasOperacao}
                onChange={(e) => updateSetup({ diasOperacao: Math.min(60, Math.max(1, Number(e.target.value) || 1)) })}
                className="w-12 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-center text-xs font-bold text-white focus:border-neon-orange focus:outline-none font-mono"
              />
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">Gera até 60 linhas de ledger com meta final</p>
          </div>
        </div>
      </div>

      {/* 4. MOTOR DE CÁLCULO E KPIS EXECUTIVOS (5 MÉTRICAS CENTRAIS) */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {/* KPI 1: BANCA ATUAL (REAL) */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 backdrop-blur-sm shadow-md">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold tracking-wider uppercase">Banca Atual (Real)</span>
            <Wallet className="h-4 w-4 text-neon-gold" />
          </div>
          <div className="mt-2 text-lg font-black text-white font-mono">
            {formatarMoeda(kpis.bancaAtualReal)}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Base: {kpis.diasOperados} {kpis.diasOperados === 1 ? "dia operado" : "dias operados"}</span>
            <span className="text-neon-gold font-bold">
              {kpis.diasOperados === 0 ? "Aguardando Dia 01" : "Atualizado"}
            </span>
          </div>
        </div>

        {/* KPI 2: PROJEÇÃO IDEAL VS. REALIDADE */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 backdrop-blur-sm shadow-md">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold tracking-wider uppercase">Projeção vs. Realidade</span>
            <TrendingUp className="h-4 w-4 text-neon-cyan" />
          </div>
          <div
            className={`mt-2 text-lg font-black font-mono flex items-center gap-1 ${
              kpis.projecaoIdealVsRealidade >= 0 ? "text-[#00E676]" : "text-[#FF1744]"
            }`}
          >
            {kpis.projecaoIdealVsRealidade >= 0 ? (
              <ArrowUpRight className="h-4 w-4 shrink-0" />
            ) : (
              <ArrowDownRight className="h-4 w-4 shrink-0" />
            )}
            {formatarMoeda(kpis.projecaoIdealVsRealidade)}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Delta teórico</span>
            <span className={kpis.projecaoIdealVsRealidade >= 0 ? "text-[#00E676] font-bold" : "text-[#FF1744] font-bold"}>
              {kpis.projecaoIdealVsRealidade >= 0 ? "Acima da Meta" : "Abaixo da Meta"}
            </span>
          </div>
        </div>

        {/* KPI 3: MÉDIA DE P/L DIÁRIO */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 backdrop-blur-sm shadow-md">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold tracking-wider uppercase">Média P/L Diário</span>
            <DollarSign className="h-4 w-4 text-neon-orange" />
          </div>
          <div
            className={`mt-2 text-lg font-black font-mono ${
              kpis.mediaPLDiario >= 0 ? "text-[#00E676]" : "text-[#FF1744]"
            }`}
          >
            {formatarMoeda(kpis.mediaPLDiario)}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>{kpis.diasGreen}G / {kpis.diasRed}R</span>
            <span>Média por Dia Operado</span>
          </div>
        </div>

        {/* KPI 4: ROI TOTAL (%) */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 backdrop-blur-sm shadow-md">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold tracking-wider uppercase">ROI Total Acumulado</span>
            <Percent className="h-4 w-4 text-purple-400" />
          </div>
          <div
            className={`mt-2 text-lg font-black font-mono ${
              kpis.roiTotalPerc >= 0 ? "text-[#00E676]" : "text-[#FF1744]"
            }`}
          >
            {formatarPerc(kpis.roiTotalPerc)}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Desde o Dia 01</span>
            <span className="font-bold text-white">
              Meta Final: {formatarMoeda(kpis.projecaoFinalMes)}
            </span>
          </div>
        </div>

        {/* KPI 5: TAXA DE CONSISTÊNCIA */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 backdrop-blur-sm shadow-md">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold tracking-wider uppercase">Taxa de Consistência</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-lg font-black text-white font-mono flex items-center justify-between">
            <span>{kpis.taxaConsistenciaPerc.toFixed(1)}%</span>
            <span className="text-xs text-muted-foreground font-normal">
              ({kpis.diasGreen}/{kpis.diasOperados})
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-neon-green to-emerald-400 shadow-[0_0_8px_rgba(0,230,118,0.5)] transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, kpis.taxaConsistenciaPerc))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5. PAINEL RICO EM DETALHES AVANÇADOS: ANÁLISE QUANTITATIVA & INTELIGÊNCIA DE RISCO */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md shadow-xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-md border border-purple-500/40 bg-purple-500/10 p-1.5 text-purple-400">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-xs font-bold tracking-wider text-white uppercase flex items-center gap-2">
                INTELIGÊNCIA DE RISCO & DETALHES QUANTITATIVOS AVANÇADOS
                <span className="text-[9px] font-sans font-normal text-muted-foreground">
                  (Métricas Institucionais de Performance)
                </span>
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Métricas de rebaixamento de capital (drawdown), expectativa matemática diária, payoff ratio e sequências
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-muted-foreground">Disciplina:</span>
            <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-bold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Gestão Rigorosa Ativa
            </span>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {/* DETALHE 1: MAXIMUM DRAWDOWN HISTÓRICO */}
          <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1 text-rose-400">
                <ShieldAlert className="h-3.5 w-3.5" />
                MAX DRAWDOWN (MDD)
              </span>
              <span className="text-[9px] text-rose-400 font-mono">Pico a Fundo</span>
            </div>
            <div className="mt-1 text-base font-mono font-black text-rose-400">
              {formatarMoeda(kpis.maxDrawdownReais)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
              <span>{kpis.maxDrawdownPerc.toFixed(1)}% de queda max</span>
              <span className={kpis.maxDrawdownPerc < 15 ? "text-neon-green" : "text-neon-orange"}>
                {kpis.maxDrawdownPerc < 15 ? "Controle Excelente" : "Atenção"}
              </span>
            </div>
          </div>

          {/* DETALHE 2: EXPECTATIVA MATEMÁTICA DIÁRIA */}
          <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1 text-neon-cyan">
                <TrendingUp className="h-3.5 w-3.5" />
                EXPECTATIVA DIÁRIA (E)
              </span>
              <span className="text-[9px] text-neon-cyan font-mono">Por dia</span>
            </div>
            <div className={`mt-1 text-base font-mono font-black ${
              kpis.expectativaMatematicaDiaria >= 0 ? "text-[#00E676]" : "text-[#FF1744]"
            }`}>
              {kpis.expectativaMatematicaDiaria >= 0 ? "+" : ""}{formatarMoeda(kpis.expectativaMatematicaDiaria)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
              <span>Win: {formatarMoeda(kpis.mediaGanhoDia)}</span>
              <span>Loss: {formatarMoeda(kpis.mediaPerdaDia)}</span>
            </div>
          </div>

          {/* DETALHE 3: PAYOFF RATIO (GANHO / PERDA) */}
          <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1 text-neon-gold">
                <Percent className="h-3.5 w-3.5" />
                PAYOFF RATIO
              </span>
              <span className="text-[9px] text-neon-gold font-mono">Ganho / Perda</span>
            </div>
            <div className="mt-1 text-base font-mono font-black text-neon-gold">
              {kpis.payoffRatio.toFixed(2)} : 1
            </div>
            <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
              <span>Recuperação: {kpis.fatorRecuperacao.toFixed(1)}x</span>
              <span className={kpis.payoffRatio >= 1.5 ? "text-neon-green" : "text-muted-foreground"}>
                {kpis.payoffRatio >= 1.5 ? "Alta Eficiência" : "Normal"}
              </span>
            </div>
          </div>

          {/* DETALHE 4: SEQUÊNCIA ATUAL & MAIOR STREAK */}
          <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1 text-neon-green">
                <Flame className="h-3.5 w-3.5" />
                SEQUÊNCIA (STREAK)
              </span>
              <span className="text-[9px] text-muted-foreground">Histórico</span>
            </div>
            <div className={`mt-1 text-base font-mono font-black ${
              kpis.streakAtual > 0 ? "text-[#00E676]" : kpis.streakAtual < 0 ? "text-[#FF1744]" : "text-white"
            }`}>
              {kpis.streakAtual > 0 ? `+${kpis.streakAtual} Dias Verdes` : kpis.streakAtual < 0 ? `${kpis.streakAtual} Dias Reds` : "Neutro"}
            </div>
            <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
              <span>Recorde Green:</span>
              <span className="text-[#00E676] font-bold">{kpis.maiorStreakGreen} dias seguidos</span>
            </div>
          </div>

          {/* DETALHE 5: PROJEÇÃO REALISTA VS META FINAL */}
          <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1 text-purple-400">
                <LineChartIcon className="h-3.5 w-3.5" />
                PROJEÇÃO REALISTA
              </span>
              <span className="text-[9px] text-purple-400 font-mono">Fim do Plano</span>
            </div>
            <div className="mt-1 text-base font-mono font-black text-purple-400">
              {formatarMoeda(kpis.projecaoEstimadaFimPlano)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
              <span>Restam {kpis.diasRestantes} dias</span>
              <span className="text-white font-bold">Meta: {formatarMoeda(kpis.projecaoFinalMes)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. TABELA INTERATIVA DE ACOMPANHAMENTO (DATA GRID ATÉ 60 DIAS) */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md shadow-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] p-3.5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neon-cyan" />
            <h3 className="font-display text-xs font-bold tracking-wider text-white uppercase">
              Tabela Interativa de Acompanhamento Diário ({gestaoConfig.diasOperacao} Dias)
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#00E676]" /> Stop Win Batido
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#FF1744]" /> Stop Loss Atingido
            </span>
            <span className="text-xs text-white/40">|</span>
            <span>Edições no passado recalibram em cascata todos os dias seguintes</span>
          </div>
        </div>

        <div className="max-h-[460px] overflow-x-auto overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-white/[0.08] bg-[#0E0E0E] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3.5 py-3">Dia</th>
                <th className="px-3.5 py-3">Banca Inicial</th>
                <th className="px-3.5 py-3">Banca Projetada (Meta)</th>
                <th className="px-3.5 py-3 min-w-[160px]">Banca Final (Input Manual)</th>
                <th className="px-3.5 py-3">Lucro / Prejuízo Diário</th>
                <th className="px-3.5 py-3">Status de Risco / Gatilhos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {tabela.map((row) => {
                const rowGlowClass = row.stopWinAlcancado
                  ? "row-stop-win"
                  : row.stopLossAlcancado
                  ? "row-stop-loss"
                  : "hover:bg-white/[0.02]";

                return (
                  <tr
                    key={row.dia}
                    className={`transition-colors ${rowGlowClass}`}
                  >
                    {/* COLUNA: DIA */}
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-mono font-bold text-white">
                      <span className="rounded bg-white/[0.05] px-2 py-0.5 border border-white/[0.08]">
                        {row.labelDia}
                      </span>
                    </td>

                    {/* COLUNA: BANCA INICIAL DO DIA */}
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-muted-foreground">
                      {formatarMoeda(row.bancaInicial)}
                    </td>

                    {/* COLUNA: BANCA PROJETADA */}
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-neon-cyan/90 font-medium">
                      {formatarMoeda(row.bancaProjetada)}
                    </td>

                    {/* COLUNA: BANCA FINAL (INPUT MANUAL) */}
                    <td className="whitespace-nowrap px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1 max-w-[150px]">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold">
                            R$
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={row.bancaFinal !== null ? row.bancaFinal : ""}
                            onChange={(e) => handleUpdateDiaFinal(row.dia, e.target.value)}
                            placeholder={row.bancaProjetada.toFixed(2)}
                            className="w-full rounded-md border border-white/10 bg-black/60 pl-8 pr-2 py-1 text-xs font-bold font-mono text-white placeholder:text-muted-foreground/30 focus:border-neon-cyan focus:bg-black/90 focus:outline-none focus:ring-1 focus:ring-neon-cyan"
                          />
                        </div>
                        {row.bancaFinal !== null && (
                          <button
                            onClick={() => handleLimparDia(row.dia)}
                            className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                            title="Limpar valor deste dia"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>

                    {/* COLUNA: LUCRO / PREJUÍZO DIÁRIO */}
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-mono font-bold">
                      {row.lucroReais !== null && row.lucroPerc !== null ? (
                        <div className="flex items-center gap-1.5">
                          <span className={row.lucroReais >= 0 ? "text-[#00E676]" : "text-[#FF1744]"}>
                            {row.lucroReais >= 0 ? "+" : ""}{formatarMoeda(row.lucroReais)}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded ${
                              row.lucroReais >= 0
                                ? "bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20"
                                : "bg-[#FF1744]/10 text-[#FF1744] border border-[#FF1744]/20"
                            }`}
                          >
                            ({formatarPerc(row.lucroPerc)})
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 font-normal">--</span>
                      )}
                    </td>

                    {/* COLUNA: STATUS DE RISCO / GATILHOS */}
                    <td className="whitespace-nowrap px-3.5 py-2.5">
                      {row.stopWinAlcancado ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#00E676]/60 bg-[#00E676]/20 px-2.5 py-0.5 text-[10px] font-black text-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.4)]">
                          STOP WIN BATIDO 🎯
                        </span>
                      ) : row.stopLossAlcancado ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#FF1744]/60 bg-[#FF1744]/20 px-2.5 py-0.5 text-[10px] font-black text-[#FF1744] shadow-[0_0_12px_rgba(255,23,68,0.4)]">
                          STOP LOSS ATINGIDO 🛑
                        </span>
                      ) : row.statusGatilho === "LUCRO" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          LUCRO CONCLUÍDO 🟢
                        </span>
                      ) : row.statusGatilho === "PREJUIZO" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400">
                          PREJUÍZO REGISTRADO 🔻
                        </span>
                      ) : row.statusGatilho === "NEUTRO" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                          ZERO A ZERO ⚪
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[10px] text-muted-foreground">
                          AGUARDANDO INPUT ⏳
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. VISUALIZAÇÃO DE DADOS (CHART.JS COMPARATIVO PROJEÇÃO VS. REALIDADE) */}
      <GraficoGestaoBanca config={gestaoConfig} tabela={tabela} />
    </div>
  );
}
