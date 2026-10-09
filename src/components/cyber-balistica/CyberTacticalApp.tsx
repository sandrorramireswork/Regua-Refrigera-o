import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  calcular10AlvosProvaveis,
  calcularCyberKpis,
  CYBER_REDS,
  getCorNumeroCyber,
} from "@/lib/cyber-balistica-engine";
import { CyberStickyHeader } from "./CyberStickyHeader";
import { CyberKeypad } from "./CyberKeypad";
import { CyberKpiPanel } from "./CyberKpiPanel";
import { CyberChart } from "./CyberChart";
import { CyberBankroll } from "./CyberBankroll";
import { TerminalQuantitativo } from "./TerminalQuantitativo";
import { ShannonEntropyBar } from "./ShannonEntropyBar";
import { RefugeAntiTiltModal } from "./RefugeAntiTiltModal";
import {
  CyberToastContainer,
  CyberFlashbangOverlay,
  dispararConfetesTaticos,
  type CyberToastItem,
  type ToastType,
} from "./CyberEffects";
import {
  RotateCcw,
  Trash2,
  History,
  Compass,
  ArrowLeft,
  Terminal,
  BarChart3,
  Layers,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { FloatingAssertivePatternGrid } from "@/components/roleta/FloatingAssertivePatternGrid";
import { FloatingQuantumConfluenceGrid } from "./FloatingQuantumConfluenceGrid";
import { getProps, type Spin } from "@/lib/roulette";
import { useThreeTierEngine } from "@/hooks/useThreeTierEngine";
import {
  calcularIndiceEntropia,
  calcularZScoreEspacial,
  avaliarModoLayout,
  AntiTiltBehavioralProxy,
  type AntiTiltState,
} from "@/lib/quantitative-terminal-engine";

const STORAGE_SPINS_KEY = "roleta-spins-v2";

export function CyberTacticalApp() {
  // Lógica Central (Core): Inicializa com spins do storage se existirem ou sementes representativas
  const [numeros, setNumeros] = useState<number[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_SPINS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const extracted = parsed
              .map((p: { number?: number; num?: number }) => (typeof p.number === "number" ? p.number : p.num))
              .filter((n: unknown): n is number => typeof n === "number" && n >= 0 && n <= 36);
            if (extracted.length > 0) {
              return extracted.slice(0, 40);
            }
          }
        }
      } catch {
        /* fallback */
      }
    }
    return [26, 14, 35, 11, 2, 19, 4, 21, 17, 34, 6, 27, 13, 36];
  });

  // Estados dos Efeitos Visuais (Flashbang & Toasts)
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [toasts, setToasts] = useState<CyberToastItem[]>([]);

  // Aba ativa de visualização no Terminal (Terminal HFT vs Dispersão Clássica vs Todos)
  const [viewTab, setViewTab] = useState<"terminal_hft" | "dispersao_kpis" | "visao_completa">("terminal_hft");

  // Estado do Filtro Comportamental Anti-Tilt
  const [antiTiltState, setAntiTiltState] = useState<AntiTiltState>(() =>
    AntiTiltBehavioralProxy.getStatus(),
  );

  // Monitora o cronômetro do Modo Refúgio quando bloqueado
  useEffect(() => {
    if (!antiTiltState.isActive) return;
    const interval = setInterval(() => {
      setAntiTiltState(AntiTiltBehavioralProxy.getStatus());
    }, 500);
    return () => clearInterval(interval);
  }, [antiTiltState.isActive]);

  const handleManualUnlockTilt = useCallback(() => {
    AntiTiltBehavioralProxy.manualUnlock();
    setAntiTiltState(AntiTiltBehavioralProxy.getStatus());
  }, []);

  const handleTiltTriggered = useCallback(() => {
    setAntiTiltState(AntiTiltBehavioralProxy.getStatus());
  }, []);

  // O último número inserido é o primeiro do array
  const ultimoNumero = numeros[0] ?? null;

  // Histórico em ordem cronológica (antigos -> recentes) para seletores de janela
  const historyArray = useMemo(() => {
    return [...numeros].reverse();
  }, [numeros]);

  // Motor Estatístico de Três Camadas (Lei do Terceiro, Poisson e Half-Kelly)
  const {
    cicloAtual,
    janelaCurta,
    leiDoTerceiro,
    poissonAnalysis,
    calcularKelly,
  } = useThreeTierEngine(historyArray);

  // 1. 10 Números Prováveis calculados pelo cilindro
  const alvosProvaveis = useMemo(() => {
    return calcular10AlvosProvaveis(ultimoNumero);
  }, [ultimoNumero]);

  // 2. KPIs Simultâneos atualizados em tempo real pelos últimos 40 números lidos
  const kpis = useMemo(() => {
    return calcularCyberKpis(numeros);
  }, [numeros]);

  // 3. Motores de Alta Frequência (Entropia de Shannon & Z-Score Espacial)
  const entropyAnalysis = useMemo(() => {
    return calcularIndiceEntropia(numeros, 25);
  }, [numeros]);

  const spatialZScore = useMemo(() => {
    return calcularZScoreEspacial(numeros, 50);
  }, [numeros]);

  // 4. Perfil Global da UI Mutante
  const morphingLayout = useMemo(() => {
    return avaliarModoLayout(entropyAnalysis, spatialZScore, antiTiltState.isActive);
  }, [entropyAnalysis, spatialZScore, antiTiltState.isActive]);

  // Converte os números em Spin[] para análise completa dos padrões
  const spinsFormatados = useMemo<Spin[]>(() => {
    return numeros.map((num, idx) => ({
      id: `cyber-spin-${idx}-${num}`,
      num,
      props: getProps(num),
      createdAt: new Date().toISOString(),
    }));
  }, [numeros]);

  // Handler: Adição de número via Teclado Digital ou clique em alvo
  const handleAddNumero = useCallback((num: number) => {
    if (num < 0 || num > 36) return;
    if (AntiTiltBehavioralProxy.getStatus().isActive) {
      setAntiTiltState(AntiTiltBehavioralProxy.getStatus());
      return;
    }

    setNumeros((prev) => {
      // Adiciona no início e limita a 40
      const next = [num, ...prev.slice(0, 39)];
      return next;
    });
  }, []);

  // Handler: Desfazer último número
  const handleUndo = useCallback(() => {
    setNumeros((prev) => prev.slice(1));
  }, []);

  // Handler: Limpar histórico
  const handleClearAll = useCallback(() => {
    setNumeros([]);
  }, []);

  // Toast Management
  const handleTriggerToast = useCallback(
    ({ type, title, message }: { type: ToastType; title: string; message: string }) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, message }]);
    },
    [],
  );

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Celebração Especial: "Green no G1"
  const handleTriggerGreenG1 = useCallback(() => {
    setFlashActive(true);
    setTimeout(() => {
      setFlashActive(false);
    }, 400);
    dispararConfetesTaticos();
  }, []);

  return (
    <div
      className={`min-h-screen w-full transition-colors duration-700 ease-out font-mono selection:bg-[#08f7fe]/30 selection:text-white relative ${
        morphingLayout.currentMode === "PREDATOR"
          ? "bg-[#04080c] text-white"
          : morphingLayout.currentMode === "SHIELD"
          ? "bg-[#070709] text-slate-200"
          : "bg-[#020617] text-slate-200"
      }`}
    >
      {/* FLASHBANG TÁTICO FULLSCREEN (0.4s FADE-OUT) */}
      <CyberFlashbangOverlay active={flashActive} />

      {/* MODAL REFÚGIO ANTI-TILT EM CASO DE CADÊNCIA FRENÉTICA */}
      <RefugeAntiTiltModal
        antiTiltState={antiTiltState}
        onManualUnlock={handleManualUnlockTilt}
      />

      {/* TOASTS NOTIFICAÇÕES (CANTO SUPERIOR DIREITO - 5s) */}
      <CyberToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* 1. HEADER TÁTICO FIXO COM ALVOS PROVÁVEIS NO ROTOR */}
      <CyberStickyHeader
        alvosProvaveis={alvosProvaveis}
        ultimoNumero={ultimoNumero}
        onSelectAlvo={handleAddNumero}
      />

      {/* BARRA DE NAVEGAÇÃO, STATUS GLOBAL & CONTROLE RÁPIDO */}
      <div className="border-b border-white/10 bg-[#080b10]/90 backdrop-blur px-4 py-2 sticky top-[73px] z-30">
        <div className="mx-auto flex max-w-[1720px] flex-wrap items-center justify-between gap-2">
          {/* IDENTIFICAÇÃO E NAVEGAÇÃO DE ROTA */}
          <div className="flex items-center gap-3">
            <Link
              to="/painel"
              className="flex items-center gap-1.5 rounded-lg border border-[#08f7fe]/40 bg-[#08f7fe]/10 px-2.5 py-1 text-xs font-bold text-[#08f7fe] hover:bg-[#08f7fe]/25 transition"
              title="Voltar ao Painel Geral"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Painel Central</span>
            </Link>

            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${morphingLayout.themeClasses.statusBadge}`}>
                {morphingLayout.currentMode === "PREDATOR" ? (
                  <Zap className="h-3 w-3 animate-pulse text-[#00FF88]" />
                ) : (
                  <Shield className="h-3 w-3 text-rose-400" />
                )}
                {morphingLayout.modeBadge}
              </span>
            </div>
          </div>

          {/* SELETOR DE MÓDULOS DO TERMINAL (HFT vs DISPERSÃO vs COMPLETO) */}
          <div className="flex items-center gap-1 rounded-xl bg-black/60 p-1 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setViewTab("terminal_hft")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-black transition cursor-pointer ${
                viewTab === "terminal_hft"
                  ? "bg-[#08f7fe]/20 text-[#08f7fe] border border-[#08f7fe]/50 shadow-[0_0_10px_rgba(8,247,254,0.3)]"
                  : "text-[#8892b0] hover:text-white"
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Terminal Quantitativo HFT</span>
            </button>

            <button
              type="button"
              onClick={() => setViewTab("dispersao_kpis")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-black transition cursor-pointer ${
                viewTab === "dispersao_kpis"
                  ? "bg-[#08f7fe]/20 text-[#08f7fe] border border-[#08f7fe]/50 shadow-[0_0_10px_rgba(8,247,254,0.3)]"
                  : "text-[#8892b0] hover:text-white"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Dispersão &amp; KPIs (Chart.js)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewTab("visao_completa")}
              className={`hidden md:flex items-center gap-1.5 rounded-lg px-3 py-1 font-black transition cursor-pointer ${
                viewTab === "visao_completa"
                  ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                  : "text-[#8892b0] hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Visão Completa</span>
            </button>
          </div>

          {/* AÇÕES DE LIMPEZA E DESFAZER */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={numeros.length === 0}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-xs font-bold text-[#8892b0] hover:text-white transition cursor-pointer disabled:opacity-30"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Desfazer</span>
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              disabled={numeros.length === 0}
              className="flex items-center gap-1 rounded-lg border border-[#ff003c]/40 bg-[#ff003c]/10 px-2.5 py-1 text-xs font-bold text-[#ff003c] hover:bg-[#ff003c]/20 transition cursor-pointer disabled:opacity-30"
            >
              <Trash2 className="h-3 w-3" />
              <span>Limpar</span>
            </button>
          </div>
        </div>
      </div>

      {/* CORPO PRINCIPAL DO TERMINAL */}
      <main className="mx-auto max-w-[1720px] p-3 sm:p-5 flex flex-col gap-5">
        {/* =========================================================================
            BARRA DE ENTROPIA DE SHANNON FIXA NO TOPO DO DASHBOARD
            ========================================================================= */}
        <ShannonEntropyBar entropy={entropyAnalysis} />

        {/* =========================================================================
            LAYOUT PRINCIPAL: COLUNA ESQUERDA (INPUTS) + COLUNA DIREITA (QUANT TERMINAL)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* =====================================================================
              COLUNA ESQUERDA (LG: 4 COLUNAS)
              - Teclado Digital com Proxy Anti-Tilt
              - Histórico Visual dos Últimos Giros
              - Gestão Financeira & Half-Kelly
              ===================================================================== */}
          <section className="lg:col-span-4 flex flex-col gap-4">
            {/* TECLADO DIGITAL COM FILTRO ANTI-TILT INTEGRADO & TARJA AMARELO NEON */}
            <CyberKeypad
              onConfirm={handleAddNumero}
              onUndo={handleUndo}
              onTiltTriggered={handleTiltTriggered}
              disabled={antiTiltState.isActive}
              numeros={numeros}
              spins={spinsFormatados}
            />

            {/* FITA DE HISTÓRICO DOS ÚLTIMOS NÚMEROS (MAX 40) */}
            <div className="rounded-2xl border border-white/10 bg-[#0d0f12] p-3 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase text-[#8892b0] flex items-center gap-1">
                  <History className="h-3.5 w-3.5 text-[#08f7fe]" />
                  HISTÓRICO RECENTE ({numeros.length}/40)
                </span>
                <span className="text-[9px] text-[#8892b0]">Esquerda: Mais Recente</span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {numeros.length === 0 ? (
                  <span className="text-[10px] text-[#8892b0] py-1">Nenhum número registrado</span>
                ) : (
                  numeros.map((n, idx) => {
                    const isRed = CYBER_REDS.includes(n);
                    return (
                      <span
                        key={`hist-${n}-${idx}`}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-black shadow ${
                          n === 0
                            ? "bg-[#00E676] text-white border-2 border-[#00FF88] shadow-[0_0_10px_#00FF88]"
                            : isRed
                            ? "bg-[#FF003C] text-white border-2 border-[#FF003C] shadow-[0_0_12px_rgba(255,0,60,0.85)]"
                            : "bg-[#000000] text-white border-2 border-white shadow-[0_0_10px_rgba(255,255,255,0.75)]"
                        } ${idx === 0 ? "ring-2 ring-[#08f7fe] scale-105" : ""}`}
                        title={`Giro #${numeros.length - idx}: ${n}`}
                      >
                        {n}
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            {/* GESTÃO FINANCEIRA, STOP-LIMITS, HALF-KELLY E EFEITO GREEN NO G1 */}
            <CyberBankroll
              onTriggerToast={handleTriggerToast}
              onTriggerGreenG1={handleTriggerGreenG1}
              poissonAnalysis={poissonAnalysis}
              calcularKelly={calcularKelly}
            />
          </section>

          {/* =====================================================================
              COLUNA DIREITA (LG: 8 COLUNAS): TERMINAL QUANTITATIVO HFT
              ===================================================================== */}
          <section className="lg:col-span-8 flex flex-col gap-4">
            {/* EXIBIÇÃO: TERMINAL QUANTITATIVO BLOOMBERG (HFT) */}
            {(viewTab === "terminal_hft" || viewTab === "visao_completa") && (
              <TerminalQuantitativo
                numeros={numeros}
                onSelectNumber={handleAddNumero}
              />
            )}

            {/* EXIBIÇÃO: DISPERSÃO & KPIS (CHART.JS LEI DO 3º) */}
            {(viewTab === "dispersao_kpis" || viewTab === "visao_completa") && (
              <div className="flex flex-col gap-4 animate-fade-in">
                {/* PAINEL DE KPIS SIMULTÂNEOS & ALERTAS POISSON */}
                <CyberKpiPanel kpis={kpis} poissonAnalysis={poissonAnalysis} />

                {/* GRÁFICO DE DISPERSÃO (CHART.JS: EIXO 0 A 36 COM LEI DO TERCEIRO) */}
                <CyberChart
                  numeros={numeros}
                  leiDoTerceiro={leiDoTerceiro}
                  onSelectNumber={handleAddNumero}
                />
              </div>
            )}
          </section>
        </div>
      </main>

      {/* GRID FLUTUANTE 3-EM-1 QUÂNTICO (VERDE NEON VÍVIDO COM FUNDO RAJADO AZUL MARINHO) */}
      <FloatingQuantumConfluenceGrid
        numeros={numeros}
        onSelectNumber={handleAddNumero}
      />
    </div>
  );
}
