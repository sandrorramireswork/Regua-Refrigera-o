import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  BellOff,
  Check,
  Compass,
  Cpu,
  Crosshair,
  Disc,
  Disc3,
  Eye,
  EyeOff,
  Flame,
  Grid3X3,
  ImageUp,
  LineChart,
  ListOrdered,
  Monitor,
  Plus,
  Radio,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Trash2,
  TrendingUp,
  Volume2,
  VolumeX,
  Wallet,
  X,
  Terminal,
  Zap,
  Crown,
  Target,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { processarPadraoUnico } from "@/lib/meta-padrao-confluencia-engine";
import { PainelStatusPadraoUnico } from "@/components/roleta/PainelStatusPadraoUnico";
import { useSpins } from "@/hooks/useSpins";
import { useConfig } from "@/hooks/useConfig";
import { analyzeConfluence } from "@/lib/confluence-engine";
import { useConfluenceConfig } from "@/hooks/useConfluenceConfig";
import { ConfluenceSettingsDrawer } from "@/components/roleta/ConfluenceSettingsDrawer";
import { UnifiedAlertsGrid } from "@/components/roleta/UnifiedAlertsGrid";
import { AlertComparisonGrid } from "@/components/roleta/AlertComparisonGrid";
import { buildUnifiedAlerts, type UnifiedAlertItem } from "@/lib/alert-confluence";
import { findMostAssertivePatternAlert } from "@/lib/pattern-tracker-engine";
import { TacticalBallisticApp } from "@/components/roleta/TacticalBallisticApp";
import { CyberTacticalApp } from "@/components/cyber-balistica/CyberTacticalApp";
import { TerminalQuantitativo } from "@/components/cyber-balistica/TerminalQuantitativo";
import {
  MirrorEngine,
  NotificationSystem,
  type MirrorSignal,
} from "@/lib/mirror-engine";
import {
  calcGrupos,
  calcDesempenhoPadrao,
  calcTendencias,
  calcZona,
  detectarPadroes,
  getProps,
  melhorPuxada,
  numerosQuentes,
  DISTORCAO_MINIMA,
} from "@/lib/roulette";


import { dispararAlerta, pedirPermissao, permissaoNotificacao } from "@/lib/notify";
import { Keypad } from "@/components/roleta/Keypad";
import { FixedKeypadDock } from "@/components/roleta/FixedKeypadDock";
import { FloatingAssertivePatternGrid } from "@/components/roleta/FloatingAssertivePatternGrid";
import { SemaforoTaticoDisparo } from "@/components/roleta/SemaforoTaticoDisparo";
import { FloatingQuantumConfluenceGrid } from "@/components/cyber-balistica/FloatingQuantumConfluenceGrid";
import { RadarPadroesFlutuante } from "@/components/radar-padroes/RadarPadroesFlutuante";
import { RadarQuantitativoPanel } from "@/components/radar-padroes/RadarQuantitativoPanel";
import { useGestaoOperacional } from "@/hooks/useGestaoOperacional";
import { TabTop10 } from "@/components/roleta/TabTop10";
import { TabCamufladoDetalhe } from "@/components/roleta/TabCamufladoDetalhe";
import { TabMotores } from "@/components/roleta/TabMotores";
import { TabDispersao } from "@/components/roleta/TabDispersao";
import { TabRodaAoVivo } from "@/components/roleta/TabRodaAoVivo";
import { TabRodaEListaPadrao } from "@/components/roleta/TabRodaEListaPadrao";
import { TabAnaliseBalistica } from "@/components/roleta/TabAnaliseBalistica";
import { TabMonitoramentoAtracao } from "@/components/roleta/TabMonitoramentoAtracao";
import { TabRodadasImagem } from "@/components/roleta/TabRodadasImagem";
import { extractImageFromClipboardEvent } from "@/lib/image-upload-utils";
import { MaximumDelaysPanel } from "@/components/roleta/MaximumDelaysPanel";
import { TabGestaoBanca } from "@/components/roleta/TabGestaoBanca";
import { LockdownOverlay } from "@/components/roleta/LockdownOverlay";
import { TabGraficoColunas } from "@/components/roleta/TabGraficoColunas";
import { TabGraficoDuzias } from "@/components/roleta/TabGraficoDuzias";
import { TabGraficoSetores } from "@/components/roleta/TabGraficoSetores";
import { TabGraficoChancesSimples } from "@/components/roleta/TabGraficoChancesSimples";
import { TabGraficoPadraoF } from "@/components/roleta/TabGraficoPadraoF";
import { useBallistics } from "@/hooks/useBallistics";
import { anguloDe, calcSniper } from "@/lib/quant";
import { analyzeExecutiveDashboard } from "@/lib/executive-engines";
import { analyzeSubtractionStrategy } from "@/lib/subtraction-strategy";
import { analyzeAttractionSignal } from "@/lib/attraction-cycles";
import { calculateMaximumDelays } from "@/lib/maximum-delays";
import { analyzeOpportunities } from "@/lib/opportunity-tracker";
import { analyzeAdvancedSignals } from "@/lib/advanced-tracker";
import { analyzeDensityRadar, type DensityRadarSignal } from "@/lib/density-radar";
import { analyzeDecisionEngine } from "@/lib/decision-engine";
import {
  calculateSmartBankroll,
  DEFAULT_SMART_BANKROLL,
  loadSmartBankroll,
  sanitizeMoney,
  saveSmartBankroll,
  type SmartBankrollConfig,
} from "@/lib/smart-bankroll";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel Operador | Roleta Pro by Sanka Master" },
      {
        name: "description",
        content:
          "Painel ao vivo para registrar giros de roleta, detectar padrões P1-P4, controlar o saldo dos jogadores e acompanhar estatísticas reais.",
      },
      { property: "og:title", content: "Painel Operador | Roleta Pro by Sanka Master" },
      {
        property: "og:description",
        content: "Registro ao vivo, padrões configuráveis, Top 10 Puxa, jogadores e estatísticas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Painel,
});

const TABS = [
  "Terminal HFT Bloomberg",
  "Cyber Balística",
  "Grade Tática & Alertas",
  "Roda ao Vivo",
  "Roda & Lista Padrão",
  "Gestão de Banca",
  "Análise Balística",
  "Spins ao Vivo",
  "Camuflado Detalhes",
  "Motores",
  "Top 10 Puxa",
  "Monitoramento de Atração e Ciclos",
  "Rodadas por Imagem",
  "Tendências & Padrão F (2x)",
] as const;

function getTabIcon(t: (typeof TABS)[number], isActive: boolean) {
  const iconClass = `h-3 w-3 shrink-0 transition-transform group-hover:scale-110 ${
    isActive ? "text-[#00E676] drop-shadow-[0_0_6px_#00E676]" : ""
  }`;

  switch (t) {
    case "Terminal HFT Bloomberg":
      return <Terminal className={`${iconClass} ${!isActive ? "text-[#00FF88]" : ""}`} />;
    case "Cyber Balística":
      return <Crosshair className={`${iconClass} ${!isActive ? "text-[#08f7fe]" : ""}`} />;
    case "Grade Tática & Alertas":
      return <Compass className={`${iconClass} ${!isActive ? "text-[#00FF88]" : ""}`} />;
    case "Roda ao Vivo":
      return <Disc className={`${iconClass} ${!isActive ? "text-neon-cyan" : ""}`} />;
    case "Roda & Lista Padrão":
      return <Disc3 className={`${iconClass} ${!isActive ? "text-cyan-400" : ""}`} />;
    case "Gestão de Banca":
      return <Wallet className={`${iconClass} ${!isActive ? "text-neon-gold" : ""}`} />;
    case "Análise Balística":
      return <Crosshair className={`${iconClass} ${!isActive ? "text-[#FF6D00]" : ""}`} />;
    case "Spins ao Vivo":
      return <Flame className={`${iconClass} ${!isActive ? "text-rose-400" : ""}`} />;
    case "Camuflado Detalhes":
      return <ShieldCheck className={`${iconClass} ${!isActive ? "text-emerald-400" : ""}`} />;
    case "Motores":
      return <Cpu className={`${iconClass} ${!isActive ? "text-yellow-400" : ""}`} />;
    case "Top 10 Puxa":
      return <TrendingUp className={`${iconClass} ${!isActive ? "text-neon-gold" : ""}`} />;
    case "Monitoramento de Atração e Ciclos":
      return <Compass className={`${iconClass} ${!isActive ? "text-purple-400" : ""}`} />;
    case "Rodadas por Imagem":
      return <Sparkles className={`${iconClass} ${!isActive ? "text-sky-400" : ""}`} />;
    case "Tendências & Padrão F (2x)":
      return <LineChart className={`${iconClass} ${!isActive ? "text-cyan-400" : ""}`} />;
    default:
      return <Disc className={iconClass} />;
  }
}

export const INFO_ABAS: Record<(typeof TABS)[number], { descricao: string; categoria: string }> = {
  "Terminal HFT Bloomberg": {
    descricao: "Terminal Quantitativo de Alta Frequência, Entropia de Shannon e Markov Multidimensional",
    categoria: "Quant & IA",
  },
  "Cyber Balística": {
    descricao: "SaaS Balístico Cyberpunk com Teclado Tático, KPIs de 40 números e radar",
    categoria: "Quant & IA",
  },
  "Grade Tática & Alertas": {
    descricao: "Matriz tática de confluência, alertas P1-P4 e gatilhos de entrada ao vivo",
    categoria: "Alertas & Padrões",
  },
  "Roda ao Vivo": {
    descricao: "Visualização do rotor europeu com calor e dispersão física ao vivo",
    categoria: "Rotor & Físico",
  },
  "Roda & Lista Padrão": {
    descricao: "Layout clássico de lista de giros e visualizador da roda",
    categoria: "Rotor & Físico",
  },
  "Gestão de Banca": {
    descricao: "Gestão inteligente de banca, stop-win, stop-loss e histórico financeiro",
    categoria: "Gestão Financeira",
  },
  "Análise Balística": {
    descricao: "Radar balístico detalhado, ângulos e previsões de dispersão",
    categoria: "Rotor & Físico",
  },
  "Spins ao Vivo": {
    descricao: "Dispersão e distribuição percentual dos giros",
    categoria: "Estatísticas",
  },
  "Camuflado Detalhes": {
    descricao: "Análise profunda de cavalos e colunas camufladas 147 / 258 / 369",
    categoria: "Alertas & Padrões",
  },
  "Motores": {
    descricao: "Estatísticas de inércia, proximidade angular e motores analíticos",
    categoria: "Quant & IA",
  },
  "Top 10 Puxa": {
    descricao: "Tabela de probabilidades de puxadas e números com maior afinidade",
    categoria: "Estatísticas",
  },
  "Monitoramento de Atração e Ciclos": {
    descricao: "Ciclos de atração e retenção angular no cilindro",
    categoria: "Rotor & Físico",
  },
  "Rodadas por Imagem": {
    descricao: "Registro e conferência visual de rodadas por captura",
    categoria: "Utilitários",
  },
  "Tendências & Padrão F (2x)": {
    descricao: "Gráfico de tendências temporais e dispersão de padrão F",
    categoria: "Estatísticas",
  },
};

export interface AtalhoItem {
  id: string;
  label: string;
  tipo: "link" | "external" | "confluencia_drawer" | "tab_gestao" | "tab_imagem" | "modal_notificacoes" | "toggle_padrao_unico";
  to?: string;
  href?: string;
  icon: typeof Crosshair;
  defaultVisible: boolean;
  corTexto: string;
  corBorda: string;
  repetido?: boolean;
  descricao: string;
}

export const ATALHOS_DISPONIVEIS: readonly AtalhoItem[] = [
  {
    id: "padrao_unico",
    label: "Padrão Único",
    tipo: "toggle_padrao_unico",
    icon: Target,
    defaultVisible: true,
    corTexto: "text-[#00FF88]",
    corBorda: "border-[#00FF88]/50 bg-emerald-950/40 hover:bg-emerald-900/60 hover:border-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.35)]",
    descricao: "Painel do Padrão Único de Alta Confluência e Circuit Breaker Anti-Red (Chart.js)",
  },
  {
    id: "terminal_hft",
    label: "Terminal HFT",
    tipo: "link",
    to: "/cyber-balistica",
    icon: Terminal,
    defaultVisible: true,
    corTexto: "text-[#00FF88]",
    corBorda: "border-[#00FF88]/50 bg-[#00FF88]/15 hover:bg-[#00FF88]/25 hover:border-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.3)]",
    descricao: "Terminal Quantitativo de Alta Frequência (Estilo Bloomberg)",
  },
  {
    id: "receber_imagem",
    label: "Receber Imagem",
    tipo: "tab_imagem",
    icon: ImageUp,
    defaultVisible: true,
    corTexto: "text-cyan-300",
    corBorda: "border-cyan-400/50 bg-cyan-950/40 hover:bg-cyan-900/60 hover:border-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.35)]",
    descricao: "Recepção de resultados por cópia/cola (Ctrl+V) ou seleção de imagem",
  },
  {
    id: "notificacoes_toggle",
    label: "Notificações",
    tipo: "modal_notificacoes",
    icon: Bell,
    defaultVisible: true,
    corTexto: "text-amber-300",
    corBorda: "border-amber-500/50 bg-amber-950/40 hover:bg-amber-900/60 hover:border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.35)]",
    descricao: "Caixa de atalhos e controle de visibilidade das notificações e HUDs (Modo Zen e Sniper)",
  },
  {
    id: "radar_padroes",
    label: "Radar Padrões",
    tipo: "link",
    to: "/radar-padroes",
    icon: Activity,
    defaultVisible: true,
    corTexto: "text-pink-300",
    corBorda: "border-pink-500/50 bg-pink-950/40 hover:bg-pink-900/60 hover:border-pink-400 shadow-[0_0_10px_rgba(255,0,127,0.35)]",
    descricao: "Radar estatístico de padrões básicos (Vermelho/Preto, Par/Ímpar, Dúzias e Colunas)",
  },
  {
    id: "dashboard",
    label: "Dashboard HUD",
    tipo: "external",
    href: "/ballistic-dashboard.html",
    icon: Crosshair,
    defaultVisible: true,
    corTexto: "text-cyan-300",
    corBorda: "border-cyan-400/50 bg-cyan-950/40 hover:bg-cyan-500/20 hover:border-cyan-300 shadow-[0_0_8px_rgba(0,229,255,0.25)]",
    descricao: "Painel balístico executivo em tempo real (HUD Neon SaaS)",
  },
  {
    id: "graficos",
    label: "Gráficos",
    tipo: "link",
    to: "/grafico",
    icon: LineChart,
    defaultVisible: true,
    corTexto: "text-neon-cyan",
    corBorda: "border-cyan-500/40 bg-black/60 hover:bg-cyan-950/60 hover:border-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.2)]",
    descricao: "Radar de densidade e gráficos de tendências",
  },
  {
    id: "giros",
    label: "Giros",
    tipo: "link",
    to: "/giros",
    icon: ListOrdered,
    defaultVisible: true,
    corTexto: "text-neon-gold",
    corBorda: "border-yellow-500/40 bg-black/60 hover:bg-yellow-950/60 hover:border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.2)]",
    descricao: "Histórico completo dos giros registrados",
  },
  {
    id: "numeros",
    label: "Mapa Mesa",
    tipo: "link",
    to: "/numeros",
    icon: Grid3X3,
    defaultVisible: true,
    corTexto: "text-neon-magenta",
    corBorda: "border-fuchsia-500/40 bg-black/60 hover:bg-fuchsia-950/60 hover:border-fuchsia-400 shadow-[0_0_8px_rgba(224,64,251,0.2)]",
    descricao: "Mapa físico de dispersão e distribuição dos números",
  },
  {
    id: "confluencia",
    label: "Confluência",
    tipo: "confluencia_drawer",
    icon: Settings,
    defaultVisible: true,
    corTexto: "text-orange-300",
    corBorda: "border-orange-500/40 bg-orange-950/30 hover:bg-orange-950/60 hover:border-orange-400",
    descricao: "Parâmetros do motor de confluência balística",
  },
  {
    id: "config",
    label: "Config",
    tipo: "link",
    to: "/configuracoes",
    icon: Sliders,
    defaultVisible: true,
    corTexto: "text-amber-300",
    corBorda: "border-amber-500/40 bg-black/60 hover:bg-amber-950/60 hover:border-amber-400 shadow-[0_0_8px_rgba(250,204,21,0.2)]",
    descricao: "Configurações gerais e regras do sistema",
  },
  {
    id: "cyber_balistica",
    label: "Cyber Balística",
    tipo: "link",
    to: "/cyber-balistica",
    icon: Crosshair,
    defaultVisible: false,
    repetido: true,
    corTexto: "text-[#08f7fe]",
    corBorda: "border-[#08f7fe]/70 bg-[#08f7fe]/15 hover:bg-[#08f7fe]/25 shadow-[0_0_8px_rgba(8,247,254,0.3)]",
    descricao: "Rota externa direta (já presente nas Abas abaixo)",
  },
  {
    id: "grade_tatica",
    label: "Grade Tática",
    tipo: "link",
    to: "/grade-tatica",
    icon: Compass,
    defaultVisible: false,
    repetido: true,
    corTexto: "text-[#00FF88]",
    corBorda: "border-[#00E676]/60 bg-[#00E676]/15 hover:bg-[#00E676]/25 shadow-[0_0_10px_rgba(0,255,136,0.3)]",
    descricao: "Rota externa direta (já presente nas Abas abaixo)",
  },
  {
    id: "gestao_banca",
    label: "Gestão Banca",
    tipo: "tab_gestao",
    icon: Wallet,
    defaultVisible: false,
    repetido: true,
    corTexto: "text-neon-gold",
    corBorda: "border-neon-gold/40 bg-neon-gold/10 hover:bg-neon-gold/20 shadow-[0_0_8px_rgba(250,204,21,0.3)]",
    descricao: "Atalho para focar na aba de Gestão (já presente nas Abas abaixo)",
  },
];

/** Giros de intervalo após um alerta de P2/P3 antes de poder alertar de novo */
const PAUSA_PADROES = 5;
const PADROES_COM_PAUSA = new Set(["P2", "P3"]);
/** Padrões gatilho que se unem à dúzia/coluna mais forte */
const PADROES_GATILHO = new Set(["P1", "P4"]);

function Painel() {
  const { setores, padroes, pullRules, isAdmin } = useConfig();
  const { spins, addSpin, addSpins, replaceSpins, undo, clearAll } = useSpins(setores);
  const { records: ballisticRecords } = useBallistics();
  const executiveAnalysis = useMemo(
    () => analyzeExecutiveDashboard(spins, pullRules, setores),
    [pullRules, setores, spins],
  );
  const subtractionSignal = useMemo(
    () => analyzeSubtractionStrategy(spins),
    [spins],
  );
  const attractionSignal = useMemo(() => analyzeAttractionSignal(spins), [spins]);
  const maximumDelays = useMemo(() => calculateMaximumDelays(spins), [spins]);
  const opportunityAnalysis = useMemo(() => analyzeOpportunities(spins), [spins]);
  const advancedAnalysis = useMemo(
    () => analyzeAdvancedSignals(spins, opportunityAnalysis),
    [opportunityAnalysis, spins],
  );
  const [smartBankrollConfig, setSmartBankrollConfig] = useState<SmartBankrollConfig>(DEFAULT_SMART_BANKROLL);
  useEffect(() => setSmartBankrollConfig(loadSmartBankroll()), []);
  const smartBankroll = useMemo(
    () => calculateSmartBankroll(
      spins,
      opportunityAnalysis.timeline,
      advancedAnalysis.confluenceTimeline,
      smartBankrollConfig,
    ),
    [advancedAnalysis.confluenceTimeline, opportunityAnalysis.timeline, smartBankrollConfig, spins],
  );
  const alertsEnabled = smartBankroll.lockdown === null;

  const gestaoOperacional = useGestaoOperacional();

  const isMetaDiariaBatida = useMemo(() => {
    const metaSessao = gestaoOperacional.sessao.statusTrava === "META_ALCANCADA";
    const metaBankroll =
      smartBankroll.lockdown === "win" ||
      (smartBankrollConfig.stopWinEnabled &&
        smartBankroll.profit >= smartBankrollConfig.dailyTarget &&
        smartBankrollConfig.dailyTarget > 0);
    return metaSessao || metaBankroll;
  }, [gestaoOperacional.sessao.statusTrava, smartBankroll.lockdown, smartBankroll.profit, smartBankrollConfig]);

  const lucroMetaBatida = useMemo(() => {
    if (gestaoOperacional.sessao.lucroLiquidoSessao > 0) {
      return gestaoOperacional.sessao.lucroLiquidoSessao;
    }
    if (smartBankroll.profit > 0) {
      return smartBankroll.profit;
    }
    return smartBankrollConfig.dailyTarget || 0;
  }, [gestaoOperacional.sessao.lucroLiquidoSessao, smartBankroll.profit, smartBankrollConfig.dailyTarget]);

  const roiMetaBatida = useMemo(() => {
    if (gestaoOperacional.sessao.roiSessaoPerc > 0) {
      return gestaoOperacional.sessao.roiSessaoPerc;
    }
    if (smartBankrollConfig.bankroll > 0 && smartBankroll.profit > 0) {
      return (smartBankroll.profit / smartBankrollConfig.bankroll) * 100;
    }
    return 0;
  }, [gestaoOperacional.sessao.roiSessaoPerc, smartBankrollConfig.bankroll, smartBankroll.profit]);

  function updateSmartBankroll(next: SmartBankrollConfig) {
    const validated = {
      bankroll: sanitizeMoney(next.bankroll),
      dailyTarget: sanitizeMoney(next.dailyTarget),
      stopLoss: sanitizeMoney(next.stopLoss),
      stopWinEnabled: next.stopWinEnabled,
      stopLossEnabled: next.stopLossEnabled,
      sessionStartIndex: next.sessionStartIndex,
      sessionDate: next.sessionDate,
      lockdownCleared: next.lockdownCleared,
    };
    setSmartBankrollConfig(validated);
    saveSmartBankroll(validated);
  }

  function handleIniciarOutroDia() {
    const today = new Date().toISOString().slice(0, 10);
    const novoBankroll = smartBankroll.currentBankroll > 0 ? smartBankroll.currentBankroll : smartBankrollConfig.bankroll;
    const next: SmartBankrollConfig = {
      ...smartBankrollConfig,
      bankroll: novoBankroll,
      sessionStartIndex: spins.length,
      sessionDate: today,
      lockdownCleared: true,
    };
    updateSmartBankroll(next);
  }
  const {
    config: confluenceConfig,
    updateConfig: updateConfluenceConfig,
    resetConfig: resetConfluenceConfig,
    applyPreset: applyConfluencePreset,
  } = useConfluenceConfig();
  const [confluenceDrawerOpen, setConfluenceDrawerOpen] = useState(false);
  const [keypadDockOpen, setKeypadDockOpen] = useState(true);

  const confluenceAnalysis = useMemo(
    () => analyzeConfluence(spins, confluenceConfig),
    [confluenceConfig, spins],
  );

  const [audioEnabled, setAudioEnabled] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem("roleta-som-neon");
    if (saved !== null) setAudioEnabled(saved === "true");
  }, []);
  function toggleAudio() {
    setAudioEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("roleta-som-neon", String(next));
      return next;
    });
  }

  const [dismissedMirrorIds, setDismissedMirrorIds] = useState<Set<string>>(new Set());
  const mirrorSignal = useMemo(
    () => MirrorEngine.analyze(spins, confluenceConfig.mirror_window_size || 7),
    [spins, confluenceConfig.mirror_window_size],
  );

  const lastPlayedMirrorId = useRef<string | null>(null);
  useEffect(() => {
    if (!mirrorSignal || dismissedMirrorIds.has(mirrorSignal.id)) return;
    if (lastPlayedMirrorId.current !== mirrorSignal.id) {
      lastPlayedMirrorId.current = mirrorSignal.id;
      // Alerta sonoro desativado para Espelho & Raiz
    }
  }, [dismissedMirrorIds, mirrorSignal]);

  const [dismissedDensityIds, setDismissedDensityIds] = useState<Set<string>>(new Set());
  const densityRadarSignal = useMemo(() => analyzeDensityRadar(spins), [spins]);
  const lastPlayedDensityId = useRef<string | null>(null);

  useEffect(() => {
    if (!densityRadarSignal || dismissedDensityIds.has(densityRadarSignal.id)) return;
    if (lastPlayedDensityId.current !== densityRadarSignal.id) {
      lastPlayedDensityId.current = densityRadarSignal.id;
      // Alerta sonoro desativado para Radar de Densidade
    }
  }, [densityRadarSignal, dismissedDensityIds]);

  // Motor do Padrão Único de Alta Confluência & Trava Anti-Red (Circuit Breaker)
  const resultadoPadraoUnico = useMemo(() => {
    return processarPadraoUnico(spins, 65);
  }, [spins]);


  const [tab, setTab] = useState<(typeof TABS)[number]>("Roda ao Vivo");
  const [pastedImageFile, setPastedImageFile] = useState<File | null>(null);
  const [largura, setLargura] = useState<"celular" | "pc">("celular");
  useEffect(() => {
    const salvo = localStorage.getItem("roleta-largura");
    if (salvo === "celular" || salvo === "pc") setLargura(salvo);
  }, []);
  function trocarLargura() {
    const nova = largura === "celular" ? "pc" : "celular";
    setLargura(nova);
    localStorage.setItem("roleta-largura", nova);
  }
  // Troca para a aba "Rodadas por Imagem" ao colar uma imagem em qualquer tela do painel e repassa o arquivo diretamente
  useEffect(() => {
    function handlePasteToTab(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        target.getAttribute("type") !== "file"
      ) {
        return;
      }
      const file = extractImageFromClipboardEvent(e);
      if (file) {
        setPastedImageFile(file);
        setTab("Rodadas por Imagem");
        setAbasVisiveis((prev) => (prev.includes("Rodadas por Imagem") ? prev : [...prev, "Rodadas por Imagem"]));
      }
    }
    window.addEventListener("paste", handlePasteToTab);
    return () => window.removeEventListener("paste", handlePasteToTab);
  }, []);

  function registrarNumero(n: number) {
    addSpin(n);
  }

  const OPCOES_FILTRO_RODADAS = [25, 50, 100, 200, 500, 0] as const;
  const [limiteRodadas, setLimiteRodadas] = useState<number>(() => {
    if (typeof window === "undefined") return 50;
    const salvo = localStorage.getItem("roleta-limite-rodadas");
    return salvo !== null ? Number(salvo) : 50;
  });

  function alterarLimiteRodadas(novo: number) {
    setLimiteRodadas(novo);
    localStorage.setItem("roleta-limite-rodadas", String(novo));
  }

  const rodadasExibidas = useMemo(() => {
    if (limiteRodadas === 0) return spins;
    return spins.slice(0, limiteRodadas);
  }, [spins, limiteRodadas]);
  const [permissao, setPermissao] = useState<string>("default");
  const alertasEnviados = useRef(new Set<string>());
  /** padrão -> total de giros no momento em que o alerta disparou */
  const pausas = useRef(new Map<string, number>());

  useEffect(() => {
    setPermissao(permissaoNotificacao());
  }, []);

  const detectados = detectarPadroes(spins, padroes).filter((r) => r.ativo);
  const ultimo = spins[0];

  // Disparo de alertas do Padrão Único e da Trava de Segurança Anti-Red
  const lastNotificacaoPadraoUnico = useRef<string | null>(null);
  useEffect(() => {
    if (!alertsEnabled || !ultimo) return;
    const chave = `${ultimo.id}-${resultadoPadraoUnico.estado}`;
    if (lastNotificacaoPadraoUnico.current === chave) return;
    lastNotificacaoPadraoUnico.current = chave;

    if (resultadoPadraoUnico.estado === "SINAL_CONFIRMADO") {
      dispararAlerta(
        `🟢 SINAL CONFIRMADO (${resultadoPadraoUnico.nivelEntradaTexto})`,
        [
          resultadoPadraoUnico.alvosFinais.length > 0
            ? `Alvos: ${resultadoPadraoUnico.alvosFinais.slice(0, 10).join(", ")}`
            : null,
          `Confluência: ${resultadoPadraoUnico.concordanciaGeralPerc.toFixed(0)}% (Mínimo 80% atingido)`,
          `Volatilidade da Mesa: ${resultadoPadraoUnico.volatilidade.volatilidadePerc.toFixed(1)}% (Segurança OK)`,
          "Padrão Único alinhado e variância da mesa controlada. Operação autorizada.",
        ]
          .filter(Boolean)
          .join("\n")
      );
    } else if (resultadoPadraoUnico.estado === "MESA_FORA_DE_FOCO") {
      dispararAlerta(
        "🔴 MESA FORA DE FOCO / PAUSA",
        [
          "ATENÇÃO: Variação extrema de mercado. Operações suspensas. Aguardando a mesa voltar ao padrão estatístico normal.",
          `Volatilidade da Mesa: ${resultadoPadraoUnico.volatilidade.volatilidadePerc.toFixed(1)}% (Limite Seguro: 65%)`,
          resultadoPadraoUnico.volatilidade.motivoAnomalia || "Circuit Breaker Anti-Red Ativado",
        ].join("\n")
      );
    }
  }, [alertsEnabled, ultimo, resultadoPadraoUnico]);

  // P2/P3: respeita a pausa de 5 giros após o último alerta disparado
  const ativos = detectados.filter((d) => {
    if (!PADROES_COM_PAUSA.has(d.padrao.code)) return true;
    const disparouEm = pausas.current.get(d.padrao.code);
    return !(
      disparouEm !== undefined &&
      disparouEm <= spins.length &&
      spins.length - disparouEm < PAUSA_PADROES
    );
  });
  const emPausa = detectados.length > 0 && ativos.length === 0;
  const ativo = ativos[0];

  // Dúzia e coluna mais fortes + distorção entre 1º e 2º lugar
  const grupos = calcGrupos(spins);
  const forteDuzia = grupos.favDuzias[0]!;
  const forteColuna = grupos.favColunas[0]!;
  const distorcaoBaixa =
    grupos.total > 0 &&
    (grupos.distDuzias < DISTORCAO_MINIMA || grupos.distColunas < DISTORCAO_MINIMA);
  const padraoPerfeito =
    !!ativo && PADROES_GATILHO.has(ativo.padrao.code) && grupos.total > 0 && !distorcaoBaixa;

  // Tendências e puxada do último número
  const tend = calcTendencias(spins);
  const letraSetor = ultimo && ultimo.props.setor !== "—" ? ultimo.props.setor.charAt(0).toUpperCase() : "";
  const puxada = ultimo ? melhorPuxada(spins, ultimo.num, pullRules) : null;
  const propsPuxada = puxada ? getProps(puxada.destino, setores) : null;
  const letraPuxada = propsPuxada?.setor && propsPuxada.setor !== "—" ? propsPuxada.setor.charAt(0).toUpperCase() : "";
  const zona = ultimo ? calcZona(spins, ultimo.num) : null;
  const quentes = numerosQuentes(spins, 5);
  const sniper = calcSniper(spins, {
    duziaForte: forteDuzia.idx,
    colunaForte: forteColuna.idx,
  });
  const tierConfluencia = sniper
    ? sniper.estrelas >= 3
      ? "TIER 1 ELITE"
      : sniper.estrelas === 2
        ? "TIER 2"
        : "TIER 3"
    : "SEM TIER";
  const retencaoTexto = sniper?.retencaoSetor ? "RETENÇÃO CONFIRMADA" : "SEM RETENÇÃO";
  const confluenciaPerc = sniper ? (sniper.estrelas / 3) * 100 : 0;
  const anguloUltimo = ultimo ? anguloDe(ultimo.num) : 0;
  const desempenhoPadrao = ativo ? calcDesempenhoPadrao(spins, ativo.padrao) : null;
  const resumoDesempenho = desempenhoPadrao?.ultimo
    ? `${desempenhoPadrao.perc.toFixed(1)}% · ÚLTIMA: ${desempenhoPadrao.ultimo.win ? `WIN NA ${desempenhoPadrao.ultimo.entrada}ª ENTRADA` : "SEM WIN EM 3 ENTRADAS"}`
    : "SEM RESULTADO ANTERIOR EM 3 ENTRADAS";
  const latestBallistic = ballisticRecords[0];
  const ballisticValidated = latestBallistic && latestBallistic.confidence > 80 ? latestBallistic : null;
  const retentionAlert = executiveAnalysis.retention?.active ? executiveAnalysis.retention : null;
  const highPrecisionEntry = executiveAnalysis.topPulls.find((row) => row.highPrecision) ?? null;

  const unifiedAlertData = useMemo(() => {
    return buildUnifiedAlerts({
      spins,
      ultimo,
      puxada,
      setores,
      ativo,
      desempenhoPadrao,
      attractionSignal,
      subtractionSignal,
      highPrecisionEntry,
      retentionAlert,
      ballisticValidated,
      sniper,
      opportunities: alertsEnabled ? opportunityAnalysis.active : [],
      activeJump: alertsEnabled ? advancedAnalysis.activeJump : null,
      activeSuperConfluence: alertsEnabled ? advancedAnalysis.activeConfluence : null,
      densityRadarSignal,
      mirrorSignal,
      confluenceCandidate: confluenceAnalysis.active ? confluenceAnalysis.topCandidate : null,
      forteDuzia,
      forteColuna,
      standardStake: smartBankroll.standardSuggestion,
      superStake: smartBankroll.superSuggestion,
      dismissedDensityIds,
      dismissedMirrorIds,
      onDismissDensity: () => {
        if (densityRadarSignal) {
          setDismissedDensityIds((prev) => new Set([...prev, densityRadarSignal.id]));
        }
      },
      onDismissMirror: () => {
        if (mirrorSignal) {
          NotificationSystem.dismiss(mirrorSignal.id);
          setDismissedMirrorIds((prev) => new Set([...prev, mirrorSignal.id]));
        }
      },
    });
  }, [
    spins,
    ultimo,
    puxada,
    setores,
    ativo,
    desempenhoPadrao,
    attractionSignal,
    subtractionSignal,
    highPrecisionEntry,
    retentionAlert,
    ballisticValidated,
    sniper,
    alertsEnabled,
    opportunityAnalysis.active,
    advancedAnalysis.activeJump,
    advancedAnalysis.activeConfluence,
    densityRadarSignal,
    mirrorSignal,
    confluenceAnalysis.active,
    confluenceAnalysis.topCandidate,
    forteDuzia,
    forteColuna,
    smartBankroll.standardSuggestion,
    smartBankroll.superSuggestion,
    dismissedDensityIds,
    dismissedMirrorIds,
  ]);



  useEffect(() => {
    if (!alertsEnabled) return;
    // CIRCUIT BREAKER ANTI-RED: Se o desvio padrão da mesa estiver acima do limite de segurança,
    // o sistema NÃO deve emitir sinais de aposta dos padrões para evitar 90% dos Reds.
    if (resultadoPadraoUnico.volatilidade.isMesaForaDeFoco) {
      return;
    }
    // Avisa sempre que qualquer padrão sair (fora da pausa de P2/P3),
    // um aviso para cada padrão que bateu no mesmo giro.
    if (ativos.length === 0 || !ultimo) {
      if (ativos.length === 0) alertasEnviados.current.clear();
      return;
    }
    const detalhe = [
      `Último ${ultimo.num}${letraSetor ? ` (${letraSetor} · ${ultimo.props.setor})` : ""}`,
      puxada ? `puxa ${puxada.destino} (${puxada.qtd}x)` : null,
      zona ? `zona ${zona.numeros.join(",")}` : null,
      `${tend.paridade.nome} ${tend.paridade.perc.toFixed(0)}%`,
      `${tend.cor.nome} ${tend.cor.perc.toFixed(0)}%`,
    ]
      .filter(Boolean)
      .join(" · ");
    const forca =
      grupos.total > 0
        ? `Dúzia ${forteDuzia.idx}ª (${forteDuzia.perc.toFixed(1)}%) + Coluna ${forteColuna.idx}ª (${forteColuna.perc.toFixed(1)}%) · `
        : "";
    for (const item of ativos) {
      const chave = `${item.padrao.code}-${ultimo.id}`;
      if (alertasEnviados.current.has(chave)) continue;
      alertasEnviados.current.add(chave);
      if (PADROES_COM_PAUSA.has(item.padrao.code)) {
        pausas.current.set(item.padrao.code, spins.length);
      }
      const perfeito = PADROES_GATILHO.has(item.padrao.code) && grupos.total > 0 && !distorcaoBaixa;
      const desempenho = calcDesempenhoPadrao(spins, item.padrao);
      const resumo = desempenho.ultimo
        ? `${desempenho.perc.toFixed(1)}% · ÚLTIMA: ${desempenho.ultimo.win ? `WIN NA ${desempenho.ultimo.entrada}ª ENTRADA` : "SEM WIN EM 3 ENTRADAS"}`
        : "SEM RESULTADO ANTERIOR EM 3 ENTRADAS";
      dispararAlerta(
        `${perfeito ? "ENTRADA CONFIRMADA" : "🚨 PADRÃO SAIU"} — ${item.padrao.code} ${item.padrao.nome}`,
        [
          puxada
            ? `Puxando ${puxada.destino}${letraPuxada ? ` (${letraPuxada} · ${propsPuxada?.setor})` : ""}`
            : "Puxando: sem histórico",
          forca || `Dúzia ${forteDuzia.idx}ª (${forteDuzia.perc.toFixed(1)}%) · Coluna ${forteColuna.idx}ª (${forteColuna.perc.toFixed(1)}%)`,
          `Alvos: ${item.padrao.alvos || "—"}`,
          `Confluência: ${tierConfluencia} · ${confluenciaPerc.toFixed(0)}% · ${sniper?.estrelas ?? 0}/3 ★`,
          sniper ? `Zona ★: ${sniper.zonaPerc.toFixed(1)}% · Kelly ★: ${(sniper.kelly * 100).toFixed(2)}%` : null,
          `Ângulo do último: ${anguloUltimo.toFixed(1)}° · Setor: ${retencaoTexto}`,
          resumo,
          detalhe,
        ].filter(Boolean).join("\n"),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertsEnabled, ativos.map((a) => a.padrao.code).join(","), ultimo, spins.length, forteDuzia, forteColuna, letraPuxada, propsPuxada, puxada, tierConfluencia, retencaoTexto, sniper, confluenciaPerc, anguloUltimo]);



  // Sniper Tier 1: alerta próprio, independente dos padrões P1-P35
  const ultimoSniper = useRef<string | null>(null);
  useEffect(() => {
    if (!alertsEnabled) return;
    if (!sniper?.disparo || !ultimo) {
      if (!sniper?.disparo) ultimoSniper.current = null;
      return;
    }
    if (ultimoSniper.current === ultimo.id) return;
    ultimoSniper.current = ultimo.id;
    dispararAlerta(
      "🎯 SNIPER ENTRY — TIER 1 ELITE",
      [
        `Zona: ${sniper.zona.join(", ")}`,
        `Frequência ${sniper.zonaPerc.toFixed(1)}% · Z ${sniper.z.toFixed(2)}`,
        `Confluência: ${tierConfluencia} · ${confluenciaPerc.toFixed(0)}% · ${sniper.estrelas}/3 ★`,
        `Zona ★: ${sniper.zonaPerc.toFixed(1)}% de frequência`,
        `Kelly ★: ${(sniper.kelly * 100).toFixed(2)}% da banca`,
        `Ângulo do último: ${anguloUltimo.toFixed(1)}° · deslocamento ${sniper.deslocamento} casas`,
        `Setor: ${retencaoTexto}`,
      ].join("\n"),
    );
  }, [alertsEnabled, sniper, ultimo, tierConfluencia, retencaoTexto, confluenciaPerc, anguloUltimo]);

  const ultimoBalisticoNotificado = useRef<string | null>(null);
  useEffect(() => {
    if (!alertsEnabled) return;
    if (!ballisticValidated || ultimoBalisticoNotificado.current === ballisticValidated.id) return;
    ultimoBalisticoNotificado.current = ballisticValidated.id;
    dispararAlerta(
      `ANÁLISE VALIDADA — ${ballisticValidated.confidence.toFixed(1)}%`,
      [
        `Número provável: ${ballisticValidated.probableNumber}`,
        `Dúzia: ${ballisticValidated.dozen}`,
        `Coluna: ${ballisticValidated.column}`,
        `Metade: ${ballisticValidated.half}`,
        `Cor: ${ballisticValidated.color}`,
      ].join("\n"),
    );
  }, [alertsEnabled, ballisticValidated]);

  const ultimaRetencaoNotificada = useRef<string | null>(null);
  useEffect(() => {
    if (!alertsEnabled) return;
    if (!retentionAlert || !ultimo || ultimaRetencaoNotificada.current === ultimo.id) return;
    ultimaRetencaoNotificada.current = ultimo.id;
    dispararAlerta(
      "⚠️ ALERTA: Retenção de Setor Ativa",
      `Núcleo ${retentionAlert.nucleus}\nZona 5: ${retentionAlert.zone5.join(", ")}\nCobertura: ${retentionAlert.hits}/4 em uma janela de 9 casas`,
    );
  }, [alertsEnabled, retentionAlert, ultimo]);

  const ultimaAltaPrecisaoNotificada = useRef<string | null>(null);
  useEffect(() => {
    if (!alertsEnabled) return;
    if (!highPrecisionEntry || !ultimo) return;
    const key = `${ultimo.id}-${highPrecisionEntry.number}`;
    if (ultimaAltaPrecisaoNotificada.current === key) return;
    ultimaAltaPrecisaoNotificada.current = key;
    dispararAlerta(
      "ENTRADA DE ALTA PRECISÃO",
      [
        `Número ${highPrecisionEntry.number} · ${highPrecisionEntry.sector}`,
        `Z-Score ${highPrecisionEntry.zScore.toFixed(6)}`,
        `Kelly ${(highPrecisionEntry.kelly * 100).toFixed(6)}%`,
        `Zona 5: ${highPrecisionEntry.zone5.join(", ")}`,
      ].join("\n"),
    );
  }, [alertsEnabled, highPrecisionEntry, ultimo]);

  const ultimaSubtracaoNotificada = useRef<string | null>(null);
  useEffect(() => {
    if (!alertsEnabled) return;
    if (!subtractionSignal) return;
    if (ultimaSubtracaoNotificada.current === subtractionSignal.triggerSpinId) return;
    ultimaSubtracaoNotificada.current = subtractionSignal.triggerSpinId;
    dispararAlerta(
      `Entrada Confirmada no terminal ${subtractionSignal.terminal} referente ao numero do padrão`,
      [
        `Cálculo: ${subtractionSignal.highNumber} - ${subtractionSignal.lowNumber} = ${subtractionSignal.difference}`,
        `Menor alvo: ${subtractionSignal.lowerTarget.number}`,
        `Zona do menor: ${subtractionSignal.lowerTarget.zone.join(", ")}`,
        `Maior alvo: ${subtractionSignal.upperTarget.number}`,
        `Zona do maior: ${subtractionSignal.upperTarget.zone.join(", ")}`,
      ].join("\n"),
    );
  }, [alertsEnabled, subtractionSignal]);

  const ultimaAtracaoNotificada = useRef<string | null>(null);
  useEffect(() => {
    if (!alertsEnabled) return;
    if (!attractionSignal || ultimaAtracaoNotificada.current === attractionSignal.triggerSpinId) return;
    ultimaAtracaoNotificada.current = attractionSignal.triggerSpinId;
    dispararAlerta(
      "PADRÃO APROXIMADO",
      [
        `Gatilho: ${attractionSignal.trigger}`,
        `Alvo: ${attractionSignal.target ?? "em observação"}`,
        `Chance: ${attractionSignal.probability === null ? "sem amostra" : `${attractionSignal.probability.toFixed(1)}%`}`,
        attractionSignal.source === "live"
          ? `${attractionSignal.observations} sucessões reais analisadas`
          : "Base catalogada",
      ].join("\n"),
    );
  }, [alertsEnabled, attractionSignal]);

  const lastOpportunityNotifications = useRef(new Set<string>());
  useEffect(() => {
    if (!alertsEnabled) return;
    for (const opportunity of opportunityAnalysis.active) {
      const key = `${opportunity.key}-${opportunity.triggerSpinId}`;
      if (lastOpportunityNotifications.current.has(key)) continue;
      lastOpportunityNotifications.current.add(key);
      dispararAlerta(
        `🚨 ALERTA DE ENTRADA — ${opportunity.kind}`,
        [
          `Alvos: ${opportunity.targetLabel}`,
          `Assertividade: ${opportunity.stats.accuracy.toFixed(1)}% de acerto até o momento (em 2 entradas)`,
        ].join("\n"),
      );
    }
  }, [alertsEnabled, opportunityAnalysis]);

  const lastAdvancedNotifications = useRef(new Set<string>());
  useEffect(() => {
    if (!alertsEnabled) return;
    const confluence = advancedAnalysis.activeConfluence;
    if (confluence) {
      const key = `${confluence.key}-${confluence.triggerSpinId}`;
      if (!lastAdvancedNotifications.current.has(key)) {
        lastAdvancedNotifications.current.add(key);
        dispararAlerta(
          "💎 SUPER CONFLUÊNCIA DETECTADA",
          [
            `Padrões Cruzados: ${confluence.patterns.join(" + ")}`,
            `Forte tendência nos números: ${confluence.targets.join(", ")}`,
            "MÁXIMA ASSERTIVIDADE · Proteção G1 (Até 2 entradas)",
          ].join("\n"),
        );
      }
    }
    const jump = advancedAnalysis.activeJump;
    if (jump) {
      const key = `${jump.key}-${jump.triggerSpinId}`;
      if (!lastAdvancedNotifications.current.has(key)) {
        lastAdvancedNotifications.current.add(key);
        dispararAlerta(
          "⚙️ PADRÃO D — SALTO FÍSICO",
          [
            `Alvo ${jump.centralTarget} · Zona 5: ${jump.targets.join(", ")}`,
            `Média ${jump.averageJump} casas · projeção +${jump.projectedJump}`,
            "Proteção G1 (Até 2 entradas)",
          ].join("\n"),
        );
      }
    }
  }, [advancedAnalysis, alertsEnabled]);

  const lastReinforcedNotification = useRef<string | null>(null);
  useEffect(() => {
    if (!alertsEnabled || !unifiedAlertData.confluence?.hasConfluence) return;
    const conf = unifiedAlertData.confluence;
    const key = `${spins[0]?.id}-${conf.participatingPatterns.join(",")}`;
    if (lastReinforcedNotification.current === key) return;
    lastReinforcedNotification.current = key;
    dispararAlerta(
      conf.title,
      conf.notificationSummary,
    );
  }, [alertsEnabled, spins, unifiedAlertData.confluence]);

  const lastConfluenceNotification = useRef<string | null>(null);
  useEffect(() => {
    if (!alertsEnabled || !confluenceAnalysis.active || !confluenceAnalysis.topCandidate || !ultimo) return;
    const cand = confluenceAnalysis.topCandidate;
    const key = `${ultimo.id}-${cand.number}-${cand.confidence}`;
    if (lastConfluenceNotification.current === key) return;
    lastConfluenceNotification.current = key;
    dispararAlerta(
      `🚨 ALERTA DE CONFLUÊNCIA — NÚMERO ${cand.number} (${cand.confidence}%)`,
      [
        `Alvo: Número ${cand.number} (${cand.sector})`,
        `Dúzia ${cand.dozen}ª · Coluna ${cand.column}ª · ${cand.color === "red" ? "Vermelho" : cand.color === "black" ? "Preto" : "Verde"}`,
        `Tags: ${cand.tags.map((t) => `[${t}]`).join(" ")}`,
        `Motores: Micro ${cand.breakdown.engine1_micro}% · Padrões ${cand.breakdown.engine2_patterns}% · Macro ${cand.breakdown.engine3_macro}%`,
      ].join("\n"),
    );
  }, [alertsEnabled, confluenceAnalysis.active, confluenceAnalysis.topCandidate, ultimo]);

  // Alerta dinâmico do Motor de Decisão Analítica (Estado 1 - Alavancagem Máxima)
  const lastDecisionNotification = useRef<string | null>(null);
  const decisionResult = useMemo(() => analyzeDecisionEngine(spins, padroes), [spins, padroes]);
  useEffect(() => {
    if (!alertsEnabled || decisionResult.estado !== 1 || !ultimo) return;
    const key = `${ultimo.id}-${decisionResult.duziaRecomendada}-${decisionResult.colunaRecomendada}`;
    if (lastDecisionNotification.current === key) return;
    lastDecisionNotification.current = key;
    dispararAlerta(
      decisionResult.mensagem,
      [
        decisionResult.subtitulo,
        `Confiança Matemática: ${decisionResult.confiancaPerc}% · Hit Rate Janela 30: ${decisionResult.hitRate30}%`,
        `Alvos em Foco: ${decisionResult.alvosNumeros.slice(0, 10).join(", ")}`,
      ].join("\n"),
    );
  }, [alertsEnabled, decisionResult, ultimo]);

  async function ativarNotificacoes() {
    const ok = await pedirPermissao();
    setPermissao(ok ? "granted" : permissaoNotificacao());
  }

  // Gerenciamento e Personalização dos Atalhos Rápidos da Barra Superior
  const [atalhosVisiveis, setAtalhosVisiveis] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return ["dashboard", "graficos", "giros", "numeros", "confluencia", "config"];
    }
    try {
      const saved = localStorage.getItem("roleta_atalhos_visiveis_ids");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ["dashboard", "graficos", "giros", "numeros", "confluencia", "config"];
  });

  const [modalAtalhosOpen, setModalAtalhosOpen] = useState(false);
  const [modalCategoriaAtiva, setModalCategoriaAtiva] = useState<"notificacoes" | "abas" | "atalhos">("notificacoes");

  const [abasVisiveis, setAbasVisiveis] = useState<string[]>(() => {
    if (typeof window === "undefined") return [...TABS];
    try {
      const saved = localStorage.getItem("roleta_abas_visiveis");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    // Padrão equilibrado que cabe perfeitamente em 3 a 4 linhas no painel
    return [
      "Terminal HFT Bloomberg",
      "Cyber Balística",
      "Grade Tática & Alertas",
      "Roda ao Vivo",
      "Gestão de Banca",
      "Análise Balística",
      "Top 10 Puxa",
      "Rodadas por Imagem",
    ];
  });

  const toggleAtalhoVisivel = (id: string) => {
    setAtalhosVisiveis((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("roleta_atalhos_visiveis_ids", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleAbaVisivel = (t: string) => {
    setAbasVisiveis((prev) => {
      let next: string[];
      if (prev.includes(t)) {
        if (prev.length <= 1) return prev; // Mantém pelo menos uma aba ativa
        next = prev.filter((item) => item !== t);
        if (tab === t) {
          const prox = next[0] as (typeof TABS)[number];
          if (prox) setTab(prox);
        }
      } else {
        next = [...prev, t];
      }
      try {
        localStorage.setItem("roleta_abas_visiveis", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const modoFluidoEssencial = () => {
    const atalhosEssenciais = ["terminal_hft", "dashboard", "graficos", "giros", "confluencia"];
    const abasEssenciais: (typeof TABS)[number][] = [
      "Terminal HFT Bloomberg",
      "Cyber Balística",
      "Grade Tática & Alertas",
      "Roda ao Vivo",
      "Gestão de Banca",
    ];
    setAtalhosVisiveis(atalhosEssenciais);
    setAbasVisiveis(abasEssenciais);
    if (!abasEssenciais.includes(tab)) {
      const primeira = abasEssenciais[0];
      if (primeira) setTab(primeira);
    }
    try {
      localStorage.setItem("roleta_atalhos_visiveis_ids", JSON.stringify(atalhosEssenciais));
      localStorage.setItem("roleta_abas_visiveis", JSON.stringify(abasEssenciais));
    } catch {}
  };

  const ativarTudo = () => {
    const todosAtalhos = ATALHOS_DISPONIVEIS.map((a) => a.id);
    const todasAbas = [...TABS];
    setAtalhosVisiveis(todosAtalhos);
    setAbasVisiveis(todasAbas);
    try {
      localStorage.setItem("roleta_atalhos_visiveis_ids", JSON.stringify(todosAtalhos));
      localStorage.setItem("roleta_abas_visiveis", JSON.stringify(todasAbas));
    } catch {}
  };

  const restaurarPadraoCompleto = () => {
    const padraoAtalhos = ["dashboard", "graficos", "giros", "numeros", "confluencia", "config"];
    setAtalhosVisiveis(padraoAtalhos);
    const abasPadrao: (typeof TABS)[number][] = [
      "Terminal HFT Bloomberg",
      "Cyber Balística",
      "Grade Tática & Alertas",
      "Roda ao Vivo",
      "Gestão de Banca",
      "Análise Balística",
      "Top 10 Puxa",
    ];
    setAbasVisiveis(abasPadrao);
    if (!abasPadrao.includes(tab)) {
      const primeira = abasPadrao[0];
      if (primeira) setTab(primeira);
    }
    try {
      localStorage.setItem("roleta_atalhos_visiveis_ids", JSON.stringify(padraoAtalhos));
      localStorage.setItem("roleta_abas_visiveis", JSON.stringify(abasPadrao));
    } catch {}
  };

  const restaurarAtalhosPadrao = () => restaurarPadraoCompleto();
  const ativarTodosAtalhos = () => ativarTudo();

  const [mostrarGridNotificacaoNormal, setMostrarGridNotificacaoNormal] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("roleta_mostrar_grid_normal");
      return saved !== null ? saved === "true" : true; // Padrão: true (exibir Central de Notificações com Decision Engine)
    } catch {
      return true;
    }
  });

  const toggleGridNotificacaoNormal = () => {
    setMostrarGridNotificacaoNormal((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("roleta_mostrar_grid_normal", String(next));
      } catch {}
      return next;
    });
  };

  const [mostrarGridQuantumConfluence, setMostrarGridQuantumConfluence] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("roleta_mostrar_grid_quantum");
      return saved !== null ? saved === "true" : true; // Padrão: true (exibir HUD Quântico Verde Neon)
    } catch {
      return true;
    }
  });

  const toggleGridQuantumConfluence = () => {
    setMostrarGridQuantumConfluence((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("roleta_mostrar_grid_quantum", String(next));
      } catch {}
      return next;
    });
  };

  const [mostrarRadarPadroes, setMostrarRadarPadroes] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("roleta_mostrar_radar_padroes");
      return saved === "true"; // Padrão: false (desativado por padrão)
    } catch {
      return false;
    }
  });

  const toggleRadarPadroes = () => {
    setMostrarRadarPadroes((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("roleta_mostrar_radar_padroes", String(next));
      } catch {}
      return next;
    });
  };

  const [mostrarRadarQuantitativo, setMostrarRadarQuantitativo] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("roleta_mostrar_radar_quantitativo");
      return saved === "true";
    } catch {
      return false;
    }
  });

  const toggleRadarQuantitativo = () => {
    setMostrarRadarQuantitativo((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("roleta_mostrar_radar_quantitativo", String(next));
      } catch {}
      return next;
    });
  };

  const [mostrarGridRadarDisparo, setMostrarGridRadarDisparo] = useState<boolean>(false);
  useEffect(() => {
    try {
      localStorage.setItem("roleta_mostrar_radar_disparo", "false");
      localStorage.setItem("roleta_mostrar_radar_padroes", "false");
      localStorage.setItem("roleta_mostrar_padrao_unico", "false");
    } catch {}
  }, []);

  const toggleGridRadarDisparo = () => {
    setMostrarGridRadarDisparo((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("roleta_mostrar_radar_disparo", String(next));
      } catch {}
      return next;
    });
  };

  // Motor do Padrão Único (Meta-Padrão Dinâmico & Circuit Breaker)
  const [mostrarPainelPadraoUnico, setMostrarPainelPadraoUnico] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("roleta_mostrar_padrao_unico");
      return saved === "true"; // Padrão: false (desativado por padrão)
    } catch {
      return false;
    }
  });

  const togglePainelPadraoUnico = () => {
    setMostrarPainelPadraoUnico((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("roleta_mostrar_padrao_unico", String(next));
      } catch {}
      return next;
    });
  };

  // Semáforo Tático de Disparo (Alta Assertividade & Comandos Sniper)
  const [mostrarSemaforoTatico, setMostrarSemaforoTatico] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("roleta_mostrar_semaforo_tatico");
      return saved !== null ? saved === "true" : true; // Padrão: true (visível por padrão)
    } catch {
      return true;
    }
  });

  const toggleSemaforoTatico = () => {
    setMostrarSemaforoTatico((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("roleta_mostrar_semaforo_tatico", String(next));
      } catch {}
      return next;
    });
  };

  // =========================================================================
  // CAIXA DE ATALHOS & GESTÃO AVANÇADA DE NOTIFICAÇÕES E HUDS (SUPRESSÃO DE RUÍDO)
  // =========================================================================
  const totalNotificacoesAtivas = useMemo(() => {
    let count = 0;
    if (mostrarPainelPadraoUnico) count++;
    if (mostrarRadarPadroes) count++;
    if (mostrarRadarQuantitativo) count++;
    if (mostrarSemaforoTatico) count++;
    if (mostrarGridQuantumConfluence) count++;
    if (mostrarGridRadarDisparo) count++;
    if (mostrarGridNotificacaoNormal) count++;
    return count;
  }, [
    mostrarPainelPadraoUnico,
    mostrarRadarPadroes,
    mostrarRadarQuantitativo,
    mostrarSemaforoTatico,
    mostrarGridQuantumConfluence,
    mostrarGridRadarDisparo,
    mostrarGridNotificacaoNormal,
  ]);

  const ocultarTodasNotificacoes = () => {
    setMostrarPainelPadraoUnico(false);
    setMostrarRadarPadroes(false);
    setMostrarRadarQuantitativo(false);
    setMostrarSemaforoTatico(false);
    setMostrarGridQuantumConfluence(false);
    setMostrarGridRadarDisparo(false);
    setMostrarGridNotificacaoNormal(false);
    try {
      localStorage.setItem("roleta_mostrar_padrao_unico", "false");
      localStorage.setItem("roleta_mostrar_radar_padroes", "false");
      localStorage.setItem("roleta_mostrar_radar_quantitativo", "false");
      localStorage.setItem("roleta_mostrar_semaforo_tatico", "false");
      localStorage.setItem("roleta_mostrar_grid_quantum", "false");
      localStorage.setItem("roleta_mostrar_radar_disparo", "false");
      localStorage.setItem("roleta_mostrar_grid_normal", "false");
    } catch {}
    toast.success("Modo Zen ativado: Todas as notificações e HUDs foram ocultados para máxima fluidez.");
  };

  const ativarNotificacoesExpert = () => {
    setMostrarPainelPadraoUnico(true);
    setMostrarRadarPadroes(true);
    setMostrarSemaforoTatico(true);
    setMostrarGridQuantumConfluence(false);
    setMostrarGridRadarDisparo(false);
    setMostrarGridNotificacaoNormal(false);
    try {
      localStorage.setItem("roleta_mostrar_padrao_unico", "true");
      localStorage.setItem("roleta_mostrar_radar_padroes", "true");
      localStorage.setItem("roleta_mostrar_semaforo_tatico", "true");
      localStorage.setItem("roleta_mostrar_grid_quantum", "false");
      localStorage.setItem("roleta_mostrar_radar_disparo", "false");
      localStorage.setItem("roleta_mostrar_grid_normal", "false");
    } catch {}
    toast.success("Modo Sniper VIP: Padrão Único (Anti-Red) e Semáforo Sniper de elite ativos.");
  };

  const ativarTodasNotificacoes = () => {
    setMostrarPainelPadraoUnico(true);
    setMostrarRadarPadroes(true);
    setMostrarSemaforoTatico(true);
    setMostrarGridQuantumConfluence(true);
    setMostrarGridRadarDisparo(true);
    setMostrarGridNotificacaoNormal(true);
    try {
      localStorage.setItem("roleta_mostrar_padrao_unico", "true");
      localStorage.setItem("roleta_mostrar_radar_padroes", "true");
      localStorage.setItem("roleta_mostrar_semaforo_tatico", "true");
      localStorage.setItem("roleta_mostrar_grid_quantum", "true");
      localStorage.setItem("roleta_mostrar_radar_disparo", "true");
      localStorage.setItem("roleta_mostrar_grid_normal", "true");
    } catch {}
    toast.success("Todas as 6 notificações e HUDs foram ativados.");
  };

  // Itens de controle e supressão de ruído para o modal
  const ITENS_CONTROLE_NOTIFICACOES = useMemo(() => [
    {
      id: "padrao_unico",
      titulo: "Motor Padrão Único (Meta-Padrão Dinâmico & Anti-Red)",
      categoria: "Confluência Máxima ≥80% · Autoajuste 37G/50G",
      descricao: "Painel de 3 estados neon (Verde/Amarelo/Vermelho), autoajuste de pesos, Circuit Breaker anti-red e gráfico Chart.js.",
      ativo: mostrarPainelPadraoUnico,
      toggle: togglePainelPadraoUnico,
      icon: Target,
      corIcone: "text-[#00FF88]",
      corBorda: "border-[#00FF88]/50 bg-emerald-950/25",
      sombra: "shadow-[0_0_12px_rgba(0,255,136,0.25)]",
      badgeModo: "Essencial: Evita 90% dos Reds",
    },
    {
      id: "radar_padroes",
      titulo: "Mini Gráfico · Tolerância & Frequências",
      categoria: "Estatístico · Curva de Tolerância G1",
      descricao: "Mini gráfico flutuante com curva gráfica de frequências, tolerância de até 2 erros (G1) e alvos com fichas interativas.",
      ativo: mostrarRadarPadroes,
      toggle: toggleRadarPadroes,
      icon: TrendingUp,
      corIcone: "text-[#ff007f]",
      corBorda: "border-[#ff007f]/50 bg-pink-950/25",
      sombra: "shadow-[0_0_12px_rgba(255,0,127,0.25)]",
      badgeModo: "Exclusivo: Mini Gráfico",
    },
    {
      id: "radar_quantitativo",
      titulo: "Radar Quantitativo · Sinais Qualificados",
      categoria: "Filtro Institucional & Sniper +EV",
      descricao: "Painel flutuante com sinais de Nível Máximo (≥88% G1) e Expert (≥82% G1), Disparo Sniper, +EV e alvos de interseção.",
      ativo: mostrarRadarQuantitativo,
      toggle: toggleRadarQuantitativo,
      icon: Crown,
      corIcone: "text-amber-400",
      corBorda: "border-amber-500/50 bg-amber-950/25",
      sombra: "shadow-[0_0_12px_rgba(251,191,36,0.25)]",
      badgeModo: "Filtro Institucional",
    },
    {
      id: "semaforo_tatico",
      titulo: "Semáforo Tático Sniper & Alvos Quentes",
      categoria: "Assertividade Máxima · HDCI",
      descricao: "Semáforo tático de disparo com alvos assertivos, cavalos camuflados e Índice de Confiança de Alta Densidade (HDCI).",
      ativo: mostrarSemaforoTatico,
      toggle: toggleSemaforoTatico,
      icon: Crosshair,
      corIcone: "text-[#00FF88]",
      corBorda: "border-[#00FF88]/50 bg-emerald-950/25",
      sombra: "shadow-[0_0_12px_rgba(0,255,136,0.25)]",
      badgeModo: "Recomendado para Modo Sniper VIP",
    },
    {
      id: "grid_quantum",
      titulo: "HUD 3-em-1 Quântico (Shannon, Clusters, Poisson)",
      categoria: "Quântico Multivariado",
      descricao: "Painel flutuante multivariado de densidade balística, clusters térmicos e Lei do Terceiro (Poisson).",
      ativo: mostrarGridQuantumConfluence,
      toggle: toggleGridQuantumConfluence,
      icon: Zap,
      corIcone: "text-[#00FF66]",
      corBorda: "border-[#00FF66]/50 bg-emerald-950/25",
      sombra: "shadow-[0_0_12px_rgba(0,255,102,0.25)]",
      badgeModo: "Ocultável para despoluição visual",
    },
    {
      id: "radar_disparo",
      titulo: "Radar Crítico de Disparo & Gatilhos Líderes",
      categoria: "Padrões Líderes & Gatilho",
      descricao: "Grade flutuante secundária de alertas de disparo tático com confluência de dúzia e coluna.",
      ativo: mostrarGridRadarDisparo,
      toggle: toggleGridRadarDisparo,
      icon: Radio,
      corIcone: "text-[#FFE600]",
      corBorda: "border-yellow-500/50 bg-yellow-950/25",
      sombra: "shadow-[0_0_12px_rgba(255,230,0,0.25)]",
      badgeModo: "Alertas integrados também no Radar Padrões",
    },
    {
      id: "grid_normal",
      titulo: "Central de Notificações em Tela (Decision Engine)",
      categoria: "Motor de Decisão em Linha",
      descricao: "Cartões de confluência analítica e avisos em linha fixados no corpo principal do painel.",
      ativo: mostrarGridNotificacaoNormal,
      toggle: toggleGridNotificacaoNormal,
      icon: Terminal,
      corIcone: "text-neon-cyan",
      corBorda: "border-cyan-500/50 bg-cyan-950/25",
      sombra: "shadow-[0_0_12px_rgba(0,255,255,0.25)]",
      badgeModo: "Pode ser ocultado se usar HUDs flutuantes",
    },
    {
      id: "audio_neon",
      titulo: "Alertas Sonoros Sintéticos & Beeps Neurais",
      categoria: "Feedback Auditivo",
      descricao: "Sons sintetizados em alta fidelidade ao disparar confluências, giros e metas operacionais.",
      ativo: audioEnabled,
      toggle: toggleAudio,
      icon: audioEnabled ? Volume2 : VolumeX,
      corIcone: audioEnabled ? "text-amber-400" : "text-slate-500",
      corBorda: "border-amber-500/50 bg-amber-950/25",
      sombra: "shadow-[0_0_12px_rgba(250,204,21,0.25)]",
      badgeModo: audioEnabled ? "Áudio Ativo" : "Áudio Mudo",
    },
  ], [
    mostrarRadarPadroes,
    mostrarSemaforoTatico,
    mostrarGridQuantumConfluence,
    mostrarGridRadarDisparo,
    mostrarGridNotificacaoNormal,
    audioEnabled,
  ]);

  // Atalhos de teclado: Alt + N (Abre Caixa de Notificações), Alt + M (Alterna Modo Zen / Ocultar Todas)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (e.altKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        setModalCategoriaAtiva("notificacoes");
        setModalAtalhosOpen((prev) => !prev);
      }
      if (e.altKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        if (totalNotificacoesAtivas > 0) {
          ocultarTodasNotificacoes();
        } else {
          ativarNotificacoesExpert();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalNotificacoesAtivas]);

  // Motor Tático de Assertividade (Radar Crítico de Disparo)
  const radarDisparoAlert = useMemo(() => {
    return findMostAssertivePatternAlert(spins, padroes, setores);
  }, [spins, padroes, setores]);

  const radarDisparoUnifiedItem = useMemo<UnifiedAlertItem | null>(() => {
    if (!radarDisparoAlert || !radarDisparoAlert.temAlertaAtivo) return null;
    const {
      padraoLider,
      duziaIndicada,
      colunaIndicada,
      probabilidadeAcertos,
      taxaG1,
      alvosIntersecao,
      mensagemTatica,
      isEntradaExpert,
    } = radarDisparoAlert;

    const isCritico = probabilidadeAcertos >= 60 || isEntradaExpert;
    const priority = isCritico ? Math.max(92, Math.round(probabilidadeAcertos)) : Math.round(probabilidadeAcertos);

    return {
      id: `radar-disparo-${padraoLider.code}-${spins[0]?.id || 0}`,
      type: "radar_critico_disparo",
      title: isCritico
        ? `🚨 RADAR CRÍTICO · DISPARO — ${padraoLider.code} ${padraoLider.nome}`
        : `🎯 DISPARO TÁTICO — ${padraoLider.code} ${padraoLider.nome}`,
      badge: isEntradaExpert ? "2.0x EXPERT" : `SCORE ${padraoLider.scoreConfianca}/100`,
      category: "padrao",
      targetNumbers: alvosIntersecao && alvosIntersecao.length > 0 ? alvosIntersecao : padraoLider.alvosArray,
      targetLabel: `${duziaIndicada.nome} (${duziaIndicada.perc.toFixed(0)}%) + ${colunaIndicada.nome} (${colunaIndicada.perc.toFixed(0)}%)`,
      dozen: duziaIndicada.idx,
      column: colunaIndicada.idx,
      accuracy2Entries: Math.max(70, Math.round(taxaG1 || padraoLider.taxaGreens)),
      accuracyLabel: `${Math.round(taxaG1 || padraoLider.taxaGreens)}% (Janela 30)`,
      priority,
      isReinforced: true,
      details: [
        { label: "Padrão Líder", value: `${padraoLider.code} (${padraoLider.scoreConfianca}/100)`, color: "gold" },
        { label: "Dúzia", value: `${duziaIndicada.nome} (${duziaIndicada.perc.toFixed(0)}%) · Mult ${duziaIndicada.multiplicador}x`, color: "cyan" },
        { label: "Coluna", value: `${colunaIndicada.nome} (${colunaIndicada.perc.toFixed(0)}%) · Mult ${colunaIndicada.multiplicador}x`, color: "cyan" },
        { label: "Alvos Interseção", value: `${alvosIntersecao.join(", ")} (4 Alvos)`, color: "green" },
        { label: "Mensagem Tática", value: mensagemTatica, color: "white" },
      ],
    };
  }, [radarDisparoAlert, spins]);

  const alertsParaRadarPadroes = useMemo(() => {
    const list = [...unifiedAlertData.alerts];
    if (radarDisparoUnifiedItem) {
      return [radarDisparoUnifiedItem, ...list.filter((a) => a.id !== radarDisparoUnifiedItem.id)];
    }
    return list;
  }, [unifiedAlertData.alerts, radarDisparoUnifiedItem]);

  return (
    <div
      className={`mx-auto flex min-h-screen w-full flex-col px-3 pt-3 transition-all ${
        largura === "pc" ? "max-w-6xl" : "max-w-md"
      } ${keypadDockOpen ? "pb-80 sm:pb-96" : "pb-24"}`}
    >
      {/* O overlay modal é mantido para Stop-Loss de segurança; a Meta Diária Batida é fixada diretamente na aba principal sem bloquear a tela */}
      {smartBankroll.lockdown === "loss" && (
        <LockdownOverlay mode="loss" onReset={handleIniciarOutroDia} />
      )}
      {/* HEADER FIXO TÁTICO COM ATALHOS SUPERIORES */}
      <div className="sticky top-0 z-40 -mx-3 px-3 pt-1.5 pb-1.5 bg-[#050e17]/95 backdrop-blur-md border-b border-cyan-500/30 shadow-[0_6px_25px_rgba(0,0,0,0.85)] flex flex-col gap-1.5">
        {/* LINHA 1: CABEÇALHO PRINCIPAL COM LOGO & CONTROLES ESSENCIAIS DO SISTEMA */}
        <header className="flex flex-wrap items-center justify-between gap-1.5">
          {/* Logo & Badge */}
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="truncate font-display text-sm sm:text-base font-black tracking-wide text-neon-cyan drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]">
              ROLETA PRO <span className="text-neon-magenta">by Sanka</span>
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-950/60 px-1.5 py-0.2 text-[8px] font-mono font-bold text-neon-cyan shadow-[0_0_8px_rgba(0,255,255,0.3)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00FF88] animate-pulse" />
              CYBER ENGINE
            </span>
          </div>

          {/* Controles de Sistema: Som, Alertas, Modo Tela, Desfazer e Limpar */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Som */}
            <button
              onClick={toggleAudio}
              aria-label={audioEnabled ? "Desativar som neon dos alertas" : "Ativar som neon dos alertas"}
              title={audioEnabled ? "Som Neon dos Alertas: ATIVO" : "Som Neon dos Alertas: MUTADO"}
              className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[8.5px] sm:text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                audioEnabled
                  ? "border-[#00E676]/60 bg-emerald-950/70 text-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.3)]"
                  : "border-white/10 bg-black/60 text-white/50 hover:text-white"
              }`}
            >
              {audioEnabled ? (
                <Volume2 className="h-3 w-3 text-[#00E676]" />
              ) : (
                <VolumeX className="h-3 w-3 text-white/40" />
              )}
              <span className="uppercase">{audioEnabled ? "Som On" : "Mudo"}</span>
            </button>

            {/* Notificações */}
            <button
              onClick={() => void ativarNotificacoes()}
              aria-label="Ativar notificações no celular"
              title="Permissão de Notificações de Alertas"
              className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[8.5px] sm:text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                permissao === "granted"
                  ? "border-cyan-400/60 bg-cyan-950/70 text-neon-cyan shadow-[0_0_8px_rgba(0,255,255,0.3)]"
                  : "border-white/10 bg-black/60 text-white/60 hover:text-white"
              }`}
            >
              {permissao === "granted" ? (
                <Bell className="h-3 w-3 text-neon-cyan" />
              ) : (
                <BellOff className="h-3 w-3 text-neon-gold" />
              )}
              <span className="uppercase">{permissao === "granted" ? "Alertas On" : "Alertas"}</span>
            </button>

            {/* Modo de Tela (PC / Celular) */}
            <button
              onClick={trocarLargura}
              aria-label="Alternar tamanho da página entre celular e PC"
              title="Alternar Layout de Visualização (PC ou Celular)"
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[8.5px] sm:text-[9px] font-mono font-bold border border-cyan-500/30 bg-black/60 text-neon-cyan hover:bg-cyan-950/50 hover:border-cyan-400 transition-all cursor-pointer"
            >
              {largura === "pc" ? (
                <Monitor className="h-3 w-3 text-neon-green" />
              ) : (
                <Smartphone className="h-3 w-3 text-neon-green" />
              )}
              <span className="uppercase">{largura === "pc" ? "Modo PC" : "Celular"}</span>
            </button>

            {/* Desfazer */}
            <button
              onClick={() => void undo()}
              aria-label="Desfazer último giro"
              title="Desfazer último giro registrado"
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[8.5px] sm:text-[9px] font-mono font-bold border border-cyan-500/40 bg-black/60 text-neon-cyan hover:bg-cyan-950/60 hover:border-cyan-400 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3 w-3 text-neon-cyan" />
              <span className="uppercase">Desfazer</span>
            </button>

            {/* Limpar */}
            <button
              onClick={() => void clearAll()}
              aria-label="Limpar histórico"
              title="Limpar histórico completo de giros"
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[8.5px] sm:text-[9px] font-mono font-bold border border-rose-500/40 bg-rose-950/30 text-rose-300 hover:bg-rose-950/70 hover:border-rose-400 hover:text-rose-200 transition-all cursor-pointer"
            >
              <Trash2 className="h-3 w-3 text-rose-400" />
              <span className="uppercase">Limpar</span>
            </button>
          </div>
        </header>

        {/* LINHA 2: BARRA DE ATALHOS TÁTICOS DOS MÓDULOS (ORGANIZADOS EM FILAS FLUIDAS SEM CORTES) */}
        <div
          data-panel-section="atalhos-modulos"
          aria-label="Atalhos rápidos para módulos e ferramentas"
          className="flex flex-wrap items-center gap-1 sm:gap-1.5 py-0.5 w-full"
        >
          {ATALHOS_DISPONIVEIS.filter((a) => atalhosVisiveis.includes(a.id)).map((a) => {
            const IconComponent = a.icon;
            if (a.tipo === "external" && a.href) {
              return (
                <a
                  key={a.id}
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={a.descricao}
                  title={a.descricao}
                  className={`flex items-center gap-1 rounded-md border ${a.corBorda} px-1.5 sm:px-2 py-0.5 sm:py-0.8 text-[8.5px] sm:text-[9px] font-display font-black uppercase ${a.corTexto} transition-all shrink-0 cursor-pointer`}
                >
                  <IconComponent className="h-3 w-3 animate-pulse" />
                  <span>{a.label}</span>
                </a>
              );
            }
            if (a.tipo === "confluencia_drawer") {
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setConfluenceDrawerOpen(true)}
                  aria-label={a.descricao}
                  title={a.descricao}
                  className={`relative flex items-center gap-1 rounded-md border ${a.corBorda} px-1.5 sm:px-2 py-0.5 sm:py-0.8 text-[8.5px] sm:text-[9px] font-display font-black uppercase ${a.corTexto} transition-all shrink-0 cursor-pointer ${
                    confluenceAnalysis.active ? "border-[#FF5E00] shadow-[0_0_10px_#FF5E00] animate-pulse" : ""
                  }`}
                >
                  <IconComponent className="h-3 w-3" />
                  <span>{a.label}</span>
                  {confluenceAnalysis.active && (
                    <span className="flex h-1.5 w-1.5 relative">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF5E00] opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF5E00]" />
                    </span>
                  )}
                </button>
              );
            }
            if (a.tipo === "tab_gestao") {
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setTab("Gestão de Banca");
                    const el = document.getElementById("painel-tab-content");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  aria-label={a.descricao}
                  title={a.descricao}
                  className={`flex items-center gap-1 rounded-md border ${a.corBorda} px-1.5 sm:px-2 py-0.5 sm:py-0.8 text-[8.5px] sm:text-[9px] font-display font-black uppercase ${a.corTexto} transition-all shrink-0 cursor-pointer ${
                    tab === "Gestão de Banca" ? "border-neon-gold bg-neon-gold/20 shadow-[0_0_10px_rgba(250,204,21,0.4)]" : ""
                  }`}
                >
                  <IconComponent className="h-3 w-3" />
                  <span>{a.label}</span>
                </button>
              );
            }
            if (a.tipo === "toggle_padrao_unico") {
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={togglePainelPadraoUnico}
                  aria-label={a.descricao}
                  title={a.descricao}
                  className={`flex items-center gap-1 rounded-md border ${a.corBorda} px-1.5 sm:px-2 py-0.5 sm:py-0.8 text-[8.5px] sm:text-[9px] font-display font-black uppercase ${a.corTexto} transition-all shrink-0 cursor-pointer ${
                    mostrarPainelPadraoUnico ? "bg-emerald-950/60 shadow-[0_0_12px_rgba(0,255,136,0.35)]" : "opacity-45 grayscale"
                  }`}
                >
                  <IconComponent className="h-3 w-3" />
                  <span>{a.label}</span>
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      !mostrarPainelPadraoUnico
                        ? "bg-slate-600"
                        : resultadoPadraoUnico.estado === "SINAL_CONFIRMADO"
                        ? "bg-[#00FF88] shadow-[0_0_8px_#00FF88]"
                        : resultadoPadraoUnico.estado === "AGUARDAR_PROXIMA"
                        ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                        : "bg-[#FF0055] shadow-[0_0_8px_#FF0055]"
                    }`}
                  />
                </button>
              );
            }
            if (a.tipo === "modal_notificacoes") {
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setModalCategoriaAtiva("notificacoes");
                    setModalAtalhosOpen(true);
                  }}
                  aria-label={a.descricao}
                  title={a.descricao}
                  className={`flex items-center gap-1 rounded-md border ${a.corBorda} px-1.5 sm:px-2 py-0.5 sm:py-0.8 text-[8.5px] sm:text-[9px] font-display font-black uppercase ${a.corTexto} transition-all shrink-0 cursor-pointer ${
                    totalNotificacoesAtivas === 0 ? "border-red-500/60 text-red-300 bg-red-950/40" : ""
                  }`}
                >
                  {totalNotificacoesAtivas === 0 ? (
                    <BellOff className="h-3 w-3 text-red-400" />
                  ) : (
                    <IconComponent className="h-3 w-3 animate-pulse" />
                  )}
                  <span>{a.label} ({totalNotificacoesAtivas}/6)</span>
                </button>
              );
            }
            if (a.tipo === "tab_imagem") {
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setTab("Rodadas por Imagem");
                    setAbasVisiveis((prev) => (prev.includes("Rodadas por Imagem") ? prev : [...prev, "Rodadas por Imagem"]));
                    const el = document.getElementById("painel-tab-content");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  aria-label={a.descricao}
                  title={a.descricao}
                  className={`flex items-center gap-1 rounded-md border ${a.corBorda} px-1.5 sm:px-2 py-0.5 sm:py-0.8 text-[8.5px] sm:text-[9px] font-display font-black uppercase ${a.corTexto} transition-all shrink-0 cursor-pointer ${
                    tab === "Rodadas por Imagem" ? "border-cyan-400 bg-cyan-950/80 shadow-[0_0_10px_rgba(0,229,255,0.4)]" : ""
                  }`}
                >
                  <IconComponent className="h-3 w-3" />
                  <span>{a.label}</span>
                </button>
              );
            }
            if (a.to) {
              return (
                <Link
                  key={a.id}
                  to={a.to}
                  aria-label={a.descricao}
                  title={a.descricao}
                  className={`flex items-center gap-1 rounded-md border ${a.corBorda} px-1.5 sm:px-2 py-0.5 sm:py-0.8 text-[8.5px] sm:text-[9px] font-display font-black uppercase ${a.corTexto} transition-all shrink-0 cursor-pointer`}
                >
                  <IconComponent className="h-3 w-3" />
                  <span>{a.label}</span>
                </Link>
              );
            }
            return null;
          })}

          {/* Admin (se autorizado) */}
          {isAdmin && (
            <Link
              to="/admin"
              aria-label="Painel de administração"
              title="Painel de administração e credenciais"
              className="flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-950/30 px-1.5 sm:px-2 py-0.5 sm:py-0.8 text-[8.5px] sm:text-[9px] font-display font-black uppercase text-purple-300 hover:bg-purple-950/60 hover:border-purple-400 transition-all shrink-0 cursor-pointer"
            >
              <Settings className="h-3 w-3 text-neon-magenta" />
              <span>Admin</span>
            </Link>
          )}

          {/* BOTÃO EXCLUSIVO: HUD 3-EM-1 QUÂNTICO (VERDE NEON & AZUL MARINHO) */}
          <button
            type="button"
            onClick={toggleGridQuantumConfluence}
            aria-label="Alternar Grid Flutuante 3-em-1 Quântico"
            title="Exibir ou ocultar o Grid Flutuante 3-em-1 (Entropia + Clusters Balísticos + Poisson/Lei do Terceiro)"
            className={`flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1 text-[8px] sm:text-[8.5px] font-mono font-bold transition-all shrink-0 cursor-pointer ml-auto ${
              mostrarGridQuantumConfluence
                ? "border-[#00FF66] bg-[#00FF66]/20 text-[#00FF66] shadow-[0_0_12px_rgba(0,255,102,0.5)]"
                : "border-emerald-600/40 bg-black/60 text-emerald-400/60 hover:text-emerald-300 hover:border-emerald-400"
            }`}
          >
            <Zap className="h-3.5 w-3.5 fill-[#00FF66]" />
            <span>HUD 3-EM-1</span>
            {mostrarGridQuantumConfluence && (
              <span className="h-1.5 w-1.5 rounded-full bg-[#00FF66] animate-pulse" />
            )}
          </button>

          {/* BOTÃO EXCLUSIVO: RADAR DE PADRÕES FLUTUANTE (ROXO ESCURO & ROSA NEON - MINI GRÁFICO) */}
          <button
            type="button"
            onClick={toggleRadarPadroes}
            aria-label="Alternar Mini Gráfico Flutuante"
            title="Exibir ou ocultar o Mini Gráfico Flutuante de Tolerância e Frequências"
            className={`flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1 text-[8px] sm:text-[8.5px] font-mono font-bold transition-all shrink-0 cursor-pointer ${
              mostrarRadarPadroes
                ? "border-[#ff007f] bg-[#ff007f]/20 text-[#ff007f] shadow-[0_0_12px_rgba(255,0,127,0.5)]"
                : "border-pink-600/40 bg-black/60 text-pink-400/60 hover:text-pink-300 hover:border-pink-400"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-[#ff007f]" />
            <span>MINI GRÁFICO</span>
            {mostrarRadarPadroes && (
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff007f] animate-pulse" />
            )}
          </button>

          {/* BOTÃO EXCLUSIVO: RADAR QUANTITATIVO SEPARADO (DOURADO / AMBER) */}
          <button
            type="button"
            onClick={toggleRadarQuantitativo}
            aria-label="Alternar Radar Quantitativo Flutuante"
            title="Exibir ou ocultar o Radar Quantitativo Separado (Sinais Qualificados Expert & Máximo)"
            className={`flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1 text-[8px] sm:text-[8.5px] font-mono font-bold transition-all shrink-0 cursor-pointer ${
              mostrarRadarQuantitativo
                ? "border-amber-400 bg-amber-400/20 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                : "border-amber-600/40 bg-black/60 text-amber-400/60 hover:text-amber-300 hover:border-amber-400"
            }`}
          >
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            <span>RADAR QUANT</span>
            {mostrarRadarQuantitativo && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          {/* BOTÃO EXCLUSIVO: RADAR CRÍTICO DISPARO (OCULTO POR PADRÃO) */}
          <button
            type="button"
            onClick={toggleGridRadarDisparo}
            aria-label="Alternar Grid Radar Crítico Disparo"
            title="Exibir ou ocultar o Grid Flutuante Radar Crítico Disparo (Alertas agora integrados ao Analisador Estatístico)"
            className={`flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1 text-[8px] sm:text-[8.5px] font-mono font-bold transition-all shrink-0 cursor-pointer ${
              mostrarGridRadarDisparo
                ? "border-[#FFE600] bg-[#FFE600]/20 text-[#FFE600] shadow-[0_0_12px_rgba(255,230,0,0.5)]"
                : "border-yellow-600/40 bg-black/60 text-yellow-400/60 hover:text-yellow-300 hover:border-yellow-400"
            }`}
          >
            <Radio className="h-3.5 w-3.5 text-[#FFE600]" />
            <span>RADAR DISPARO</span>
            {mostrarGridRadarDisparo && (
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFE600] animate-pulse" />
            )}
          </button>

          {/* BOTÃO EXCLUSIVO: MOTOR PADRÃO ÚNICO DE ALTA CONFLUÊNCIA & CIRCUIT BREAKER */}
          <button
            type="button"
            onClick={togglePainelPadraoUnico}
            aria-label="Alternar Motor do Padrão Único e Trava Anti-Red"
            title="Exibir ou ocultar o Painel do Padrão Único de Alta Confluência (≥80%) e Circuit Breaker Anti-Red com Gráfico Chart.js"
            className={`flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1 text-[8px] sm:text-[8.5px] font-mono font-bold uppercase transition-all shrink-0 cursor-pointer shadow-sm ${
              mostrarPainelPadraoUnico
                ? resultadoPadraoUnico.estado === "SINAL_CONFIRMADO"
                  ? "border-[#00FF88] bg-[#00FF88]/20 text-[#00FF88] shadow-[0_0_12px_rgba(0,255,136,0.4)]"
                  : resultadoPadraoUnico.estado === "AGUARDAR_PROXIMA"
                  ? "border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.4)]"
                  : "border-[#FF0055] bg-[#FF0055]/20 text-[#FF0055] shadow-[0_0_12px_rgba(255,0,85,0.4)]"
                : "border-slate-700 bg-black/60 text-slate-400 hover:text-white hover:border-slate-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                !mostrarPainelPadraoUnico
                  ? "bg-slate-600"
                  : resultadoPadraoUnico.estado === "SINAL_CONFIRMADO"
                  ? "bg-[#00FF88] shadow-[0_0_8px_#00FF88] animate-pulse"
                  : resultadoPadraoUnico.estado === "AGUARDAR_PROXIMA"
                  ? "bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse"
                  : "bg-[#FF0055] shadow-[0_0_8px_#FF0055] animate-ping"
              }`}
            />
            <span>PADRÃO ÚNICO</span>
            {mostrarPainelPadraoUnico && (
              <span className="text-[7.5px] font-black opacity-80">
                {resultadoPadraoUnico.estado === "SINAL_CONFIRMADO" ? "🟢 90%+" : resultadoPadraoUnico.estado === "AGUARDAR_PROXIMA" ? "🟡 DESVIO" : "🔴 PAUSA"}
              </span>
            )}
          </button>

          {/* BOTÃO EXCLUSIVO: SEMÁFORO TÁTICO SNIPER (VERDE NEON) */}
          <button
            type="button"
            onClick={toggleSemaforoTatico}
            aria-label="Alternar Semáforo Tático Sniper"
            title="Exibir ou ocultar o Semáforo Tático de Disparo com Alvos de Alta Assertividade e Cavalos Camuflados"
            className={`flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1 text-[8px] sm:text-[8.5px] font-mono font-bold uppercase transition-all shrink-0 cursor-pointer shadow-sm ${
              mostrarSemaforoTatico
                ? "border-[#00FF88] bg-[#00FF88]/20 text-[#00FF88] shadow-[0_0_12px_rgba(0,255,136,0.4)]"
                : "border-slate-700 bg-black/60 text-slate-400 hover:text-white hover:border-slate-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                mostrarSemaforoTatico
                  ? "bg-[#00FF88] shadow-[0_0_8px_#00FF88] animate-pulse"
                  : "bg-slate-600"
              }`}
            />
            <span>SEMÁFORO SNIPER</span>
          </button>

          {/* BOTÃO EXCLUSIVO: CAIXA DE ATALHOS PARA OCULTAR & FILTRAR NOTIFICAÇÕES */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setModalCategoriaAtiva("notificacoes");
                setModalAtalhosOpen(true);
              }}
              aria-label="Caixa de Atalhos: Ocultar ou filtrar notificações"
              title="Caixa de Atalhos: Oculte notificações com 1 clique ou ative o Modo Sniper Expert (Alt+N)"
              className={`flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1 text-[8px] sm:text-[8.5px] font-mono font-bold transition-all shrink-0 cursor-pointer shadow-sm ${
                totalNotificacoesAtivas === 0
                  ? "border-red-500/80 bg-gradient-to-r from-red-950/90 to-black text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                  : totalNotificacoesAtivas <= 2
                  ? "border-amber-400/80 bg-gradient-to-r from-amber-950/80 to-black text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.35)]"
                  : "border-purple-500/70 bg-gradient-to-r from-purple-950/80 to-black text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
              }`}
            >
              {totalNotificacoesAtivas === 0 ? (
                <>
                  <BellOff className="h-3.5 w-3.5 text-red-400 animate-pulse" />
                  <span className="font-extrabold tracking-tight">NOTIFICAÇÕES (0/6)</span>
                </>
              ) : (
                <>
                  <Bell className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                  <span>NOTIFICAÇÕES ({totalNotificacoesAtivas}/6)</span>
                </>
              )}
            </button>

            {/* BOTÃO RÁPIDO DE 1 CLIQUE: ALTERNAR ENTRE MODO ZEN E RESTAURAR */}
            <button
              type="button"
              onClick={totalNotificacoesAtivas > 0 ? ocultarTodasNotificacoes : ativarNotificacoesExpert}
              aria-label={totalNotificacoesAtivas > 0 ? "Ocultar todas as notificações agora (Alt+M)" : "Restaurar notificações Sniper Expert (Alt+M)"}
              title={totalNotificacoesAtivas > 0 ? "1 Clique: Ocultar todas as notificações para máxima fluidez (Alt+M)" : "1 Clique: Restaurar notificações no Modo Sniper Expert (Alt+M)"}
              className={`flex items-center justify-center rounded-lg border px-1.5 py-1 text-[8.5px] transition-all cursor-pointer ${
                totalNotificacoesAtivas > 0
                  ? "border-white/20 bg-black/60 text-white/60 hover:text-red-400 hover:border-red-500/60 hover:bg-red-950/40"
                  : "border-[#00FF88]/60 bg-emerald-950/60 text-[#00FF88] hover:bg-emerald-900/80 shadow-[0_0_8px_rgba(0,255,136,0.3)] animate-pulse"
              }`}
            >
              {totalNotificacoesAtivas > 0 ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* BOTÃO EXCLUSIVO: CAIXA DE ATALHOS & ABAS */}
          <button
            type="button"
            onClick={() => setModalAtalhosOpen(true)}
            aria-label="Caixa de Atalhos: Ativar ou desativar ferramentas não usadas"
            title="Caixa de Atalhos: Ative ou desative ferramentas para um visual fluido em 3 ou 4 linhas"
            className="flex items-center gap-1.5 rounded-lg border border-cyan-400/60 bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:border-cyan-300 hover:from-cyan-900/90 hover:to-blue-900/90 px-2.5 py-1 text-[8px] sm:text-[8.5px] font-mono font-bold text-neon-cyan shadow-[0_0_12px_rgba(0,255,255,0.3)] transition-all shrink-0 cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5 text-neon-cyan animate-pulse" />
            <span>Caixa Atalhos ({atalhosVisiveis.length + abasVisiveis.length})</span>
          </button>
        </div>

        {/* LINHA 3 & 4: ATALHOS TÁTICOS DAS ABAS DO PAINEL (ORGANIZADAS EM FILAS FLUIDAS SEM CORTES) */}
        <nav
          aria-label="Abas do painel de operações"
          className="flex flex-wrap items-center gap-1 sm:gap-1.5 py-1 border-t border-cyan-500/20 pt-1 w-full"
        >
          {TABS.filter((t) => abasVisiveis.includes(t)).map((t) => {
            const isActive = tab === t;
            return (
              <button
                key={`top-${t}`}
                onClick={() => {
                  setTab(t);
                  const el = document.getElementById("painel-tab-content");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`group shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 sm:py-1 font-display text-[8.5px] sm:text-[9px] font-black uppercase tracking-tight transition-all cursor-pointer ${
                  isActive
                    ? "border-2 border-[#00E676] bg-gradient-to-r from-emerald-950/90 via-[#032e18]/90 to-emerald-950/90 text-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.7),inset_0_0_6px_rgba(0,230,118,0.35)] ring-1 ring-[#00E676]/60"
                    : "border border-white/20 bg-black/85 text-white/80 hover:text-white hover:border-cyan-400/60 hover:bg-black/95 hover:shadow-[0_0_8px_rgba(0,255,255,0.3)]"
                }`}
              >
                {getTabIcon(t, isActive)}
                <span className={isActive ? "text-[#00E676] text-stroke-black-sm drop-shadow-[0_0_6px_#00E676]" : "text-stroke-black-sm"}>
                  {t}
                </span>
                {isActive && (
                  <span className="h-1 w-1 rounded-full bg-[#00E676] shadow-[0_0_6px_#00E676] animate-pulse shrink-0" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* =========================================================================
          NOTIFICAÇÃO FIXA DE META DIÁRIA BATIDA NA ABA PRINCIPAL
          ========================================================================= */}
      {isMetaDiariaBatida && (
        <div
          role="alert"
          className="my-2.5 rounded-2xl border-2 border-yellow-400 bg-gradient-to-r from-[#241700] via-[#120a00] to-black p-3.5 sm:p-4 text-white shadow-[0_0_35px_rgba(250,204,21,0.55),inset_0_0_20px_rgba(250,204,21,0.2)] backdrop-blur-xl animate-in slide-in-from-top-2 duration-300 ring-2 ring-yellow-400/40"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-yellow-400 bg-yellow-400/20 text-yellow-300 shadow-[0_0_20px_#FACC15] shrink-0 animate-bounce">
                <Trophy className="h-6 w-6 fill-yellow-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-sm sm:text-base font-black uppercase tracking-wider text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.7)] flex items-center gap-1.5">
                    <span>🏆 META DIÁRIA BATIDA COM SUCESSO!</span>
                  </h2>
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-400 px-2 py-0.5 text-[9px] font-mono font-black text-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.5)]">
                    DISCIPLINA OPERACIONAL 100%
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-white/90 font-mono mt-1 font-bold leading-relaxed">
                  Lucro Líquido:{" "}
                  <span className="text-[#00FF88] font-black text-sm sm:text-base drop-shadow-[0_0_6px_#00FF88]">
                    +{lucroMetaBatida.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                  {roiMetaBatida > 0 && (
                    <span className="text-yellow-300 ml-1.5 font-black">
                      ({roiMetaBatida >= 0 ? "+" : ""}{roiMetaBatida.toFixed(1)}% ROI)
                    </span>
                  )}
                  {" "}— Sua meta de stop-win foi alcançada. O segredo da consistência matemática é parar no green e proteger o capital!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  gestaoOperacional.desbloquearTrava();
                  updateSmartBankroll({
                    ...smartBankrollConfig,
                    lockdownCleared: true,
                  });
                  toast.info("Travas liberadas para continuar operando sob sua responsabilidade.");
                }}
                className="rounded-xl px-3.5 py-2 text-[10px] sm:text-[11px] font-mono font-black uppercase border-2 border-white/50 bg-black/80 text-white hover:bg-white hover:text-black hover:border-white transition-all shadow-md cursor-pointer"
                title="Liberar trava preventiva e continuar operando"
              >
                Desbloquear
              </button>
              <button
                type="button"
                onClick={() => {
                  gestaoOperacional.resetarSessao();
                  handleIniciarOutroDia();
                  toast.success("Novo dia iniciado! Contadores zerados com sucesso.");
                }}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] sm:text-[11px] font-mono font-black uppercase border-2 border-yellow-400 bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_#FACC15] cursor-pointer"
                title="Reiniciar contadores de meta e iniciar sessão do próximo dia"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Iniciar Outro Dia</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CAIXA / MODAL DE GERENCIAMENTO DE ATALHOS & ABAS
          ========================================================================= */}
      {modalAtalhosOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-atalhos-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setModalAtalhosOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border-2 border-cyan-500/60 bg-gradient-to-b from-[#071725] via-[#040e17] to-black p-4 sm:p-5 shadow-[0_0_50px_rgba(0,255,255,0.3)] text-white select-none max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Topo do Modal */}
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/50 bg-cyan-950/70 shadow-[0_0_12px_rgba(0,255,255,0.35)]">
                  <Sliders className="h-4.5 w-4.5 text-neon-cyan" />
                </div>
                <div>
                  <h3 id="modal-atalhos-title" className="font-display text-xs sm:text-sm font-black uppercase tracking-wide text-neon-cyan text-stroke-black-sm drop-shadow-[0_0_8px_#00FFFF]">
                    CAIXA DE ATALHOS & CONTROLE OPERACIONAL
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-[#8892b0]">
                    Ative, silencie ou filtre notificações, abas e atalhos para manter seu painel limpo, fluido e com assertividade cirúrgica.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAtalhosOpen(false)}
                aria-label="Fechar caixa de atalhos"
                className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* PRESETS DE CONFIGURAÇÃO RÁPIDA (DINÂMICOS POR CATEGORIA) */}
            <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
              {modalCategoriaAtiva === "notificacoes" ? (
                <>
                  <button
                    type="button"
                    onClick={ocultarTodasNotificacoes}
                    title="Silencia e oculta todos os 5 HUDs e notificações em tela para visualização 100% limpa (Modo Zen)"
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/60 bg-red-950/50 hover:bg-red-900/60 hover:border-red-400 p-2 text-left transition cursor-pointer group shadow-[0_0_10px_rgba(239,68,68,0.25)]"
                  >
                    <BellOff className="h-3.5 w-3.5 text-red-400 shrink-0 animate-pulse" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-display font-black text-red-400 uppercase tracking-tight">
                        Modo Zen (Ocultar Todas)
                      </div>
                      <div className="text-[8px] text-red-300/70 truncate">
                        0 HUDs em tela · Máxima fluidez
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={ativarNotificacoesExpert}
                    title="Ativa apenas Semáforo Tático Sniper e Radar de Padrões com supressão de ruído"
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/60 bg-amber-950/40 hover:bg-amber-900/50 hover:border-amber-400 p-2 text-left transition cursor-pointer group shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                  >
                    <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-display font-black text-amber-300 uppercase tracking-tight">
                        Modo Sniper VIP (Expert)
                      </div>
                      <div className="text-[8px] text-amber-300/70 truncate">
                        Semáforo Sniper + Radar Padrões
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={ativarTodasNotificacoes}
                    title="Ativa todos os 5 módulos de monitoramento quantitativo e HUDs flutuantes"
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 hover:border-cyan-400 p-2 text-left transition cursor-pointer group shadow-[0_0_8px_rgba(0,255,255,0.15)]"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-neon-cyan shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-display font-black text-neon-cyan uppercase tracking-tight">
                        Modo Completo (Exibir Todas)
                      </div>
                      <div className="text-[8px] text-cyan-300/70 truncate">
                        5 HUDs ativos · Visão macro
                      </div>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={modoFluidoEssencial}
                    title="Ativa apenas os 5 módulos e atalhos essenciais para máxima fluidez e velocidade"
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-[#00FF88]/60 bg-emerald-950/50 hover:bg-emerald-900/60 hover:border-[#00FF88] p-2 text-left transition cursor-pointer group shadow-[0_0_10px_rgba(0,255,136,0.2)]"
                  >
                    <Zap className="h-3.5 w-3.5 text-[#00FF88] shrink-0 animate-pulse" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-display font-black text-[#00FF88] uppercase tracking-tight">
                        Modo Fluido (Essencial)
                      </div>
                      <div className="text-[8px] text-emerald-300/70 truncate">
                        5 abas limpas em 3 linhas
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={restaurarPadraoCompleto}
                    title="Restaura a seleção recomendada balanceada"
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-yellow-500/40 bg-yellow-950/30 hover:bg-yellow-900/40 hover:border-yellow-400 p-2 text-left transition cursor-pointer group shadow-[0_0_8px_rgba(250,204,21,0.15)]"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-neon-gold shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-display font-black text-neon-gold uppercase tracking-tight">
                        Padrão Recomendado
                      </div>
                      <div className="text-[8px] text-yellow-300/70 truncate">
                        7 abas táticas + atalhos
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={ativarTudo}
                    title="Ativa todas as 14 abas e todos os atalhos disponíveis"
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 hover:border-cyan-400 p-2 text-left transition cursor-pointer group shadow-[0_0_8px_rgba(0,255,255,0.15)]"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-neon-cyan shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-display font-black text-neon-cyan uppercase tracking-tight">
                        Ativar Todos
                      </div>
                      <div className="text-[8px] text-cyan-300/70 truncate">
                        Exibir grade completa (14 abas)
                      </div>
                    </div>
                  </button>
                </>
              )}
            </div>

            {/* SELEÇÃO DE CATEGORIA: [NOTIFICAÇÕES & HUDS] vs [ABAS DO PAINEL] vs [ATALHOS DA BARRA] */}
            <div className="flex border-b border-white/10 mb-3 shrink-0">
              <button
                type="button"
                onClick={() => setModalCategoriaAtiva("notificacoes")}
                className={`flex-1 py-2 px-2 text-center text-xs font-display font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalCategoriaAtiva === "notificacoes"
                    ? "border-amber-400 text-amber-300 bg-amber-950/40 shadow-[0_2px_10px_rgba(251,191,36,0.2)]"
                    : "border-transparent text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <Bell className="h-3.5 w-3.5" />
                <span>Notificações ({totalNotificacoesAtivas}/5)</span>
              </button>

              <button
                type="button"
                onClick={() => setModalCategoriaAtiva("abas")}
                className={`flex-1 py-2 px-2 text-center text-xs font-display font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalCategoriaAtiva === "abas"
                    ? "border-neon-cyan text-neon-cyan bg-cyan-950/40 shadow-[0_2px_10px_rgba(0,255,255,0.2)]"
                    : "border-transparent text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <Disc className="h-3.5 w-3.5" />
                <span>Abas ({abasVisiveis.length}/{TABS.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setModalCategoriaAtiva("atalhos")}
                className={`flex-1 py-2 px-2 text-center text-xs font-display font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalCategoriaAtiva === "atalhos"
                    ? "border-neon-cyan text-neon-cyan bg-cyan-950/40 shadow-[0_2px_10px_rgba(0,255,255,0.2)]"
                    : "border-transparent text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Atalhos ({atalhosVisiveis.length}/{ATALHOS_DISPONIVEIS.length})</span>
              </button>
            </div>

            {/* LISTAGEM DE ITENS COM SCROLL SUAVE */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 min-h-0">
              {modalCategoriaAtiva === "notificacoes" ? (
                // LISTAGEM DE NOTIFICAÇÕES E HUDS FLUTUANTES (6 ITENS)
                ITENS_CONTROLE_NOTIFICACOES.map((item) => {
                  const IconComp = item.icon;
                  const isVisible = item.ativo;
                  return (
                    <div
                      key={`modal-notif-${item.id}`}
                      onClick={item.toggle}
                      className={`flex items-center justify-between gap-3 rounded-xl p-3 border transition-all cursor-pointer group ${
                        isVisible
                          ? `${item.corBorda} ${item.sombra}`
                          : "border-white/10 bg-white/[0.02] opacity-55 hover:opacity-90 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border shrink-0 transition-transform group-hover:scale-105 ${
                            isVisible
                              ? `${item.corBorda} ${item.corIcone} shadow-[0_0_10px_currentColor]`
                              : "border-white/10 bg-black/60 text-white/40"
                          }`}
                        >
                          <IconComp className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-xs font-display font-black uppercase tracking-tight ${
                                isVisible ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]" : "text-white/60"
                              }`}
                            >
                              {item.titulo}
                            </span>
                            <span className="rounded px-1.5 py-0.2 text-[8px] font-mono font-bold uppercase border border-cyan-500/30 bg-cyan-950/40 text-cyan-300">
                              {item.categoria}
                            </span>
                            {item.badgeModo && (
                              <span className="rounded px-1.5 py-0.2 text-[7.5px] font-mono font-semibold uppercase border border-white/15 bg-black/40 text-white/70">
                                {item.badgeModo}
                              </span>
                            )}
                          </div>
                          <p className="text-[9.5px] text-[#8892b0] truncate mt-0.5">
                            {item.descricao}
                          </p>
                        </div>
                      </div>

                      {/* Botão de Toggle Visual */}
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            item.toggle();
                          }}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[9px] font-mono font-bold uppercase border transition-all cursor-pointer ${
                            isVisible
                              ? "border-[#00FF88] bg-[#00FF88]/20 text-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.35)] hover:bg-[#00FF88]/30"
                              : "border-red-500/40 bg-red-950/30 text-red-400 hover:text-red-300 hover:border-red-400"
                          }`}
                        >
                          {isVisible ? (
                            <>
                              <Check className="h-3 w-3 text-[#00FF88]" />
                              <span>Exibindo</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 text-red-400" />
                              <span>Oculto</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : modalCategoriaAtiva === "abas" ? (
                // LISTAGEM DE ABAS DO PAINEL (14 ABAS)
                TABS.map((abaNome) => {
                  const isVisible = abasVisiveis.includes(abaNome);
                  const isOnlyOne = isVisible && abasVisiveis.length <= 1;
                  const info = INFO_ABAS[abaNome];
                  return (
                    <div
                      key={`modal-tab-${abaNome}`}
                      onClick={() => !isOnlyOne && toggleAbaVisivel(abaNome)}
                      className={`flex items-center justify-between gap-3 rounded-xl p-2.5 border transition-all cursor-pointer ${
                        isVisible
                          ? "border-[#00FF88]/50 bg-emerald-950/25 shadow-[0_0_12px_rgba(0,255,136,0.15)]"
                          : "border-white/10 bg-white/[0.02] opacity-55 hover:opacity-90 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${
                            isVisible
                              ? "border-[#00FF88]/60 bg-emerald-950/80 shadow-[0_0_8px_rgba(0,255,136,0.3)] text-[#00FF88]"
                              : "border-white/10 bg-black/60 text-white/40"
                          }`}
                        >
                          {getTabIcon(abaNome, isVisible)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-display font-black uppercase tracking-tight ${
                              isVisible ? "text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]" : "text-white/60"
                            }`}>
                              {abaNome}
                            </span>
                            {info?.categoria && (
                              <span className="rounded px-1.5 py-0.2 text-[8px] font-mono font-bold uppercase border border-cyan-500/30 bg-cyan-950/40 text-cyan-300">
                                {info.categoria}
                              </span>
                            )}
                          </div>
                          <p className="text-[9.5px] text-[#8892b0] truncate mt-0.5">
                            {info?.descricao || "Módulo analítico do painel"}
                          </p>
                        </div>
                      </div>

                      {/* Botão de Ativar / Não Ativar com feedback visual claro */}
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isOnlyOne}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isOnlyOne) toggleAbaVisivel(abaNome);
                          }}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[9px] font-mono font-bold uppercase border transition-all cursor-pointer ${
                            isVisible
                              ? "border-[#00FF88] bg-[#00FF88]/20 text-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.35)] hover:bg-[#00FF88]/30"
                              : "border-white/20 bg-black/60 text-white/50 hover:text-white hover:border-white/40"
                          } ${isOnlyOne ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                          {isVisible ? (
                            <>
                              <Check className="h-3 w-3 text-[#00FF88]" />
                              <span>Ativado</span>
                            </>
                          ) : (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                              <span>Desativado</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                // LISTAGEM DE ATALHOS RÁPIDOS (ATALHOS_DISPONIVEIS)
                ATALHOS_DISPONIVEIS.map((item) => {
                  const IconComp = item.icon;
                  const isVisible = atalhosVisiveis.includes(item.id);
                  return (
                    <div
                      key={`custom-atalho-${item.id}`}
                      onClick={() => toggleAtalhoVisivel(item.id)}
                      className={`flex items-center justify-between gap-3 rounded-xl p-2.5 border transition-all cursor-pointer ${
                        isVisible
                          ? "border-cyan-400/50 bg-cyan-950/30 shadow-[0_0_12px_rgba(0,255,255,0.15)]"
                          : "border-white/10 bg-white/[0.02] opacity-55 hover:opacity-90 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${
                            isVisible
                              ? `${item.corBorda} shadow-[0_0_8px_rgba(0,255,255,0.25)]`
                              : "border-white/10 bg-black/60 text-white/40"
                          }`}
                        >
                          <IconComp className={`h-4 w-4 ${isVisible ? item.corTexto : "text-white/40"}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs font-display font-black uppercase tracking-tight ${
                              isVisible ? "text-white" : "text-white/60"
                            }`}>
                              {item.label}
                            </span>
                            {item.repetido && (
                              <span className="rounded px-1 py-0.2 text-[8px] font-mono font-bold uppercase border border-amber-500/40 bg-amber-950/50 text-amber-300">
                                Já na Aba
                              </span>
                            )}
                          </div>
                          <p className="text-[9.5px] text-[#8892b0] truncate mt-0.5">{item.descricao}</p>
                        </div>
                      </div>

                      {/* Botão de Ativar / Não Ativar */}
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAtalhoVisivel(item.id);
                          }}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[9px] font-mono font-bold uppercase border transition-all cursor-pointer ${
                            isVisible
                              ? "border-cyan-400 bg-cyan-500/20 text-neon-cyan shadow-[0_0_10px_rgba(0,255,255,0.35)] hover:bg-cyan-500/30"
                              : "border-white/20 bg-black/60 text-white/50 hover:text-white hover:border-white/40"
                          }`}
                        >
                          {isVisible ? (
                            <>
                              <Check className="h-3 w-3 text-neon-cyan" />
                              <span>Ativado</span>
                            </>
                          ) : (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                              <span>Desativado</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="mt-4 pt-3 border-t border-cyan-500/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="text-[10px] text-white/70 font-mono">
                {modalCategoriaAtiva === "notificacoes" ? (
                  <>
                    Notificações: <strong className={totalNotificacoesAtivas === 0 ? "text-red-400 font-black" : totalNotificacoesAtivas <= 2 ? "text-amber-300 font-black" : "text-neon-cyan font-black"}>{totalNotificacoesAtivas} ativas de 6 HUDs</strong>
                    {totalNotificacoesAtivas === 0 && <span className="ml-1 text-emerald-400 font-bold">(Modo Zen: 100% Fluido)</span>}
                    {totalNotificacoesAtivas === 2 && <span className="ml-1 text-[#00FF88] font-bold">(Modo Sniper VIP: Alta Precisão)</span>}
                    {totalNotificacoesAtivas > 2 && <span className="ml-1 text-cyan-300 font-bold">(Visão Macro)</span>}
                  </>
                ) : (
                  <>
                    Visual Fluido: <strong className="text-neon-cyan">{abasVisiveis.length} abas</strong> e <strong className="text-neon-green">{atalhosVisiveis.length} atalhos</strong> ativos (~3 a 4 linhas no topo)
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setModalAtalhosOpen(false)}
                className="rounded-lg border-2 border-[#00FF88] bg-emerald-950/80 px-4 py-1.5 text-xs font-display font-black uppercase text-[#00FF88] shadow-[0_0_14px_rgba(0,255,136,0.6)] hover:bg-[#00FF88]/20 transition cursor-pointer ml-auto"
              >
                Concluir & Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAINEL DO MOTOR DE PADRÃO ÚNICO DE ALTA CONFLUÊNCIA & TRAVA ANTI-RED */}
      {mostrarPainelPadraoUnico && (
        <div className="mt-2.5 w-full min-w-0" data-panel-strip="padrao-unico">
          <PainelStatusPadraoUnico
            resultado={resultadoPadraoUnico}
            onSelectNumber={registrarNumero}
          />
        </div>
      )}

      {/* SEMÁFORO TÁTICO DE DISPARO E ASSERTIVIDADE (ALERTA DE ALTA ASSERTIVIDADE & COMANDOS SNIPER) */}
      {mostrarSemaforoTatico && (
        <div className="mt-2.5 w-full min-w-0" data-panel-strip="semaforo-tatico">
          <SemaforoTaticoDisparo
            spins={spins}
            onSelectNumber={registrarNumero}
            onLoadSampleSpins={replaceSpins}
            setores={setores}
            padroes={padroes}
          />
        </div>
      )}

      {/* SEÇÃO DE NOTIFICAÇÃO NORMAL EM TELA (OCULTADA POR PADRÃO PARA DAR ESPAÇO AO HUD FLUTUANTE DESLOCÁVEL) */}
      {mostrarGridNotificacaoNormal ? (
        <div className="mt-2 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-mono text-yellow-300/80 uppercase">
              Grid de Notificação Normal em Tela
            </span>
            <button
              type="button"
              onClick={toggleGridNotificacaoNormal}
              className="text-[9px] font-mono text-yellow-400 hover:underline cursor-pointer"
            >
              Ocultar Grid Normal (Usar Apenas HUD Flutuante Deslocável)
            </button>
          </div>
          {/* TIRA 1: CENTRAL DE NOTIFICAÇÕES & ALERTAS ATIVOS (LARGURA TOTAL) */}
          <div className="w-full min-w-0" data-panel-strip="notificacoes">
            <UnifiedAlertsGrid
              alerts={unifiedAlertData.alerts}
              confluence={unifiedAlertData.confluence}
              onSelectNumber={registrarNumero}
              onSelectTab={(tabName) => setTab(tabName as (typeof TABS)[number])}
              ultimo={ultimo}
              puxada={puxada}
              propsPuxada={propsPuxada}
              letraSetor={letraSetor}
              letraPuxada={letraPuxada}
              forteDuzia={forteDuzia}
              forteColuna={forteColuna}
              tend={tend}
              zona={zona}
              quentes={quentes}
              grupos={grupos}
              spins={spins}
              setores={setores}
            />
          </div>

          {/* TIRA 2: MONITORAMENTO DE MÁXIMAS & RADAR DE CONVERGÊNCIA (LADO A LADO 50%/50% NO PC, COBRINDO TODA A LARGURA SEM ESPAÇOS VAZIOS) */}
          <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-2.5 items-start" data-panel-strip="maximas-radar">
            <MaximumDelaysPanel delays={maximumDelays} spins={spins} />
            <AlertComparisonGrid
              alerts={unifiedAlertData.alerts}
              confluence={unifiedAlertData.confluence}
              spins={spins}
              setores={setores}
              onSelectNumber={registrarNumero}
            />
          </div>
        </div>
      ) : (
        /* Barra compacta tática indicando status dos HUDs flutuantes e do grid normal */
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#00FF66]/30 bg-slate-950/60 px-3 py-1.5 text-[9px] font-mono text-cyan-200/80">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00FF66] animate-pulse" />
            <span>HUD 3-em-1: <strong className="text-[#00FF66]">{mostrarGridQuantumConfluence ? "Ativo" : "Oculto"}</strong> · Grid Normal: <strong className="text-white/60">Oculto</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleGridQuantumConfluence}
              className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase transition cursor-pointer ${
                mostrarGridQuantumConfluence
                  ? "border-[#00FF66]/60 bg-emerald-950/80 text-[#00FF66] hover:bg-emerald-900/80"
                  : "border-slate-600 bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="h-3 w-3" />
              <span>{mostrarGridQuantumConfluence ? "HUD 3-em-1 Aberto" : "Abrir HUD 3-em-1"}</span>
            </button>
            <button
              type="button"
              onClick={toggleGridNotificacaoNormal}
              className="flex items-center gap-1 rounded border border-[#FFE600]/50 bg-yellow-950/60 hover:bg-yellow-900/70 px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase text-[#FFE600] transition cursor-pointer"
            >
              <Eye className="h-3 w-3" />
              <span>Exibir Grid Normal</span>
            </button>
          </div>
        </div>
      )}

      {/* MÉTRICAS QUANTITATIVAS DO CAMUFLADO */}
      {sniper && (
        <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center text-[10px] sm:grid-cols-6">
          <Quant label="Confluência Tier" valor={`${confluenciaPerc.toFixed(0)}%`} ok={sniper.estrelas >= 3} />
          <Quant label="Z-Score" valor={sniper.z.toFixed(2)} ok={sniper.z >= 1.65} />
          <Quant
            label="Kelly"
            valor={`${(sniper.kelly * 100).toFixed(2)}%`}
            ok={sniper.kelly > 0}
          />
          <Quant
            label="Zona 5 casas"
            valor={`${sniper.zonaPerc.toFixed(1)}%`}
            ok={sniper.zonaPerc >= 22.5}
          />
          <Quant
            label="Ângulo último"
            valor={`${anguloUltimo.toFixed(1)}°`}
            ok={sniper.deslocamento <= 2}
          />
          <Quant label="Retenção setor" valor={sniper.retencaoSetor ? "SIM" : "NÃO"} ok={sniper.retencaoSetor} />
        </div>
      )}

      {distorcaoBaixa && (
        <div className="mt-1.5 rounded-md border border-neon-gold/50 bg-neon-gold/10 px-2 py-1 text-center text-[10px] font-bold text-neon-gold">
          ⚠ DISTORÇÃO ABAIXO DE {DISTORCAO_MINIMA}%
          {grupos.distDuzias < DISTORCAO_MINIMA && ` · dúzias ${grupos.distDuzias.toFixed(1)}%`}
          {grupos.distColunas < DISTORCAO_MINIMA && ` · colunas ${grupos.distColunas.toFixed(1)}%`}
          {" — mesa equilibrada, evitar entrada"}
        </div>
      )}

      {permissao !== "granted" && (
        <button
          onClick={() => void ativarNotificacoes()}
          className="mt-1.5 rounded-md border border-neon-gold/50 px-2 py-1 text-[10px] text-neon-gold"
        >
          Toque para receber o aviso no celular quando um padrão confirmar
        </button>
      )}

      {/* TERÇO 3 — REGISTRO AO VIVO (GRADE COMPACTA COM FILTRO DE RODADAS) */}
      <section
        data-panel-section="registro"
        className="mt-2.5 flex flex-col rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-b from-[#061826]/90 via-black/95 to-[#030d14]/95 p-2.5 sm:p-3 shadow-[0_0_22px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500/30"
        aria-label="Histórico de Registro ao Vivo"
      >
        {/* Cabeçalho com Filtros de Rodadas */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/30 pb-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-neon-magenta text-stroke-black drop-shadow-[0_0_6px_#FF10F0]">
              REGISTRO AO VIVO
            </span>
            <span className="rounded-full bg-cyan-950/80 border border-neon-cyan/70 px-2 py-0.5 font-mono text-[9px] font-black text-neon-cyan shadow-[0_0_8px_rgba(0,255,255,0.4)] whitespace-nowrap">
              {rodadasExibidas.length} de {spins.length}G
            </span>
            <button
              type="button"
              onClick={() => {
                setTab("Rodadas por Imagem");
                setAbasVisiveis((prev) => (prev.includes("Rodadas por Imagem") ? prev : [...prev, "Rodadas por Imagem"]));
                const el = document.getElementById("painel-tab-content");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="flex items-center gap-1 rounded-md border border-cyan-400/50 bg-cyan-950/70 hover:bg-cyan-900/90 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-300 hover:text-white transition-all cursor-pointer shadow-[0_0_8px_rgba(0,255,255,0.25)]"
              title="Receber rodadas por imagem, print ou Ctrl+V"
            >
              <ImageUp className="size-3 text-cyan-400" />
              <span>Importar por Imagem (Ctrl+V)</span>
            </button>
          </div>

          {/* Botões de Filtro de Rodadas */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-black uppercase text-white/60 tracking-wider hidden sm:inline text-stroke-black-sm mr-1">
              Exibir:
            </span>
            {OPCOES_FILTRO_RODADAS.map((qtd) => {
              const isActive = limiteRodadas === qtd;
              const label = qtd === 0 ? "MAX" : String(qtd);
              return (
                <button
                  key={`filtro-rodadas-${qtd}`}
                  type="button"
                  onClick={() => alterarLimiteRodadas(qtd)}
                  className={`rounded-lg px-2 py-0.5 font-mono text-[9.5px] sm:text-[10px] font-black uppercase transition-all cursor-pointer ${
                    isActive
                      ? "border-2 border-[#00E676] bg-emerald-950/90 text-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.7)] ring-1 ring-[#00E676]/60 drop-shadow-[0_0_4px_#00E676]"
                      : "border border-white/20 bg-black/85 text-white/70 hover:text-white hover:border-cyan-400/50 hover:bg-black"
                  }`}
                  title={qtd === 0 ? "Exibir todas as rodadas" : `Exibir últimas ${qtd} rodadas`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legenda de Setores */}
        <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-white/60 pb-1 font-mono">
          <span className="text-neon-cyan font-bold tracking-tight">
            Mais recente à esquerda ➔
          </span>
          <span className="text-neon-gold font-bold">
            {setores.map((s) => `${s.name.charAt(0).toUpperCase()}=${s.name}`).join(" · ")}
          </span>
        </div>

        {/* Grade Compacta de Bolas (Espaços Reduzidos e Alto Rendimento) */}
        <div
          className="max-h-[14rem] sm:max-h-[18rem] overflow-y-auto no-scrollbar scroll-smooth grid grid-cols-[repeat(auto-fill,minmax(2.15rem,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5 sm:gap-2 p-1 pt-1.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {rodadasExibidas.map((s, idx) => {
            const letra = s.props.setor === "—" ? "" : s.props.setor.charAt(0).toUpperCase();
            const isLatest = idx === 0;
            return (
              <div
                key={s.id}
                className="relative flex items-center justify-center aspect-square"
                title={`Giro #${spins.length - idx}: Número ${s.num} (${s.props.cor === "red" ? "Vermelho" : s.props.cor === "black" ? "Preto" : "Zero"}, Dúzia ${s.props.duzia}, Coluna ${s.props.coluna}, Setor ${s.props.setor})`}
              >
                <button
                  type="button"
                  onClick={() => registrarNumero(s.num)}
                  className={`group relative flex h-full w-full items-center justify-center rounded-full font-display text-xs sm:text-sm font-black transition-all cursor-pointer hover:scale-115 ${
                    s.num === 0 ? "num-green" : s.props.cor === "red" ? "num-red" : "num-black"
                  } ${
                    isLatest
                      ? "ring-2 ring-neon-cyan shadow-[0_0_14px_rgba(0,255,255,0.85)] animate-pulse"
                      : ""
                  }`}
                >
                  <span className="text-stroke-black-sm">{s.num}</span>

                  {letra && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full border border-neon-gold/80 bg-black font-display text-[7.5px] sm:text-[8px] font-black text-neon-gold shadow-[0_0_4px_rgba(250,204,21,0.5)]">
                      {letra}
                    </span>
                  )}
                </button>
              </div>
            );
          })}

          {spins.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs font-bold text-white/50">
              Nenhum giro registrado. Digite um número no teclado acima.
            </div>
          )}
        </div>
      </section>

      {/* ABAS & CONTEÚDO ATIVO (ORGANIZADAS EM FILAS FLUIDAS SEM CORTES) */}
      <div
        id="painel-tab-content"
        className="mt-3 flex flex-wrap items-center gap-1.5 pb-1"
      >
        {TABS.filter((t) => abasVisiveis.includes(t)).map((t) => {
          const isActive = tab === t;
          return (
            <button
              key={`content-${t}`}
              onClick={() => setTab(t)}
              className={`group shrink-0 inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-display text-[10.5px] sm:text-[11px] font-black uppercase tracking-tight transition-all cursor-pointer ${
                isActive
                  ? "border-2 border-[#00E676] bg-gradient-to-r from-emerald-950/90 via-[#032e18]/90 to-emerald-950/90 text-[#00E676] shadow-[0_0_16px_rgba(0,230,118,0.7),inset_0_0_8px_rgba(0,230,118,0.35)] ring-1 ring-[#00E676]/60"
                  : "border border-white/20 bg-black/85 text-white/80 hover:text-white hover:border-cyan-400/60 hover:bg-black/95 hover:shadow-[0_0_10px_rgba(0,255,255,0.3)]"
              }`}
            >
              {getTabIcon(t, isActive)}
              <span className={isActive ? "text-[#00E676] text-stroke-black-sm drop-shadow-[0_0_6px_#00E676]" : "text-stroke-black-sm"}>
                {t}
              </span>
              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E676] shadow-[0_0_6px_#00E676] animate-pulse shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex-1">
        {tab === "Terminal HFT Bloomberg" && (
          <TerminalQuantitativo
            numeros={spins.map((s) => s.num)}
            onSelectNumber={registrarNumero}
            bankrollTotal={smartBankroll.currentBankroll || 1000}
          />
        )}
        {tab === "Cyber Balística" && <CyberTacticalApp />}
        {tab === "Grade Tática & Alertas" && (
          <TacticalBallisticApp
            spins={spins}
            padroes={padroes}
            setores={setores}
            onSelectNumber={registrarNumero}
            onUndo={undo}
            onClearAll={clearAll}
          />
        )}
        {tab === "Roda ao Vivo" && <TabRodaAoVivo spins={spins} />}
        {tab === "Roda & Lista Padrão" && (
          <TabRodaEListaPadrao spins={spins} onAddSpin={registrarNumero} />
        )}
        {tab === "Gestão de Banca" && (
          <TabGestaoBanca
            config={smartBankrollConfig}
            analysis={smartBankroll}
            onChange={updateSmartBankroll}
            onIniciarOutroDia={handleIniciarOutroDia}
            spinsCount={spins.length}
          />
        )}
        {tab === "Análise Balística" && <TabAnaliseBalistica spinCount={spins.length} />}
        {tab === "Spins ao Vivo" && <TabDispersao spins={spins} />}
        {tab === "Camuflado Detalhes" && (
          <TabCamufladoDetalhe
            spins={spins}
            sniper={sniper}
            origem={`${spins.length} giros deste aparelho`}
          />
        )}
        {tab === "Motores" && <TabMotores spins={spins} regras={pullRules} />}
        {tab === "Top 10 Puxa" && (
          <TabTop10 spins={spins} regras={pullRules} setores={setores} />
        )}
        {tab === "Monitoramento de Atração e Ciclos" && (
          <TabMonitoramentoAtracao spins={spins} onAddSpin={registrarNumero} />
        )}
        {tab === "Rodadas por Imagem" && (
          <TabRodadasImagem
            onAddSpins={addSpins}
            onReplaceSpins={replaceSpins}
            onClearAll={clearAll}
            onNavigateToLive={() => setTab("Roda ao Vivo")}
            initialFile={pastedImageFile}
            onClearInitialFile={() => setPastedImageFile(null)}
          />
        )}
        {tab === "Tendências & Padrão F (2x)" && (
          <div className="space-y-6">
            <TabGraficoColunas spins={spins} onAddSpin={registrarNumero} />
            <TabGraficoDuzias spins={spins} onAddSpin={registrarNumero} />
            <TabGraficoSetores spins={spins} onAddSpin={registrarNumero} />
            <TabGraficoChancesSimples spins={spins} onAddSpin={registrarNumero} />
            <TabGraficoPadraoF spins={spins} onAddSpin={registrarNumero} />
          </div>
        )}
      </div>

      <ConfluenceSettingsDrawer
        open={confluenceDrawerOpen}
        onClose={() => setConfluenceDrawerOpen(false)}
        config={confluenceConfig}
        onChange={updateConfluenceConfig}
        onReset={resetConfluenceConfig}
        onApplyPreset={applyConfluencePreset}
      />

      {/* GRID FLUTUANTE DESLOCÁVEL DE NOTIFICAÇÕES & ASSERTIVIDADE (RADAR CRÍTICO DISPARO - DESATIVADO POR PADRÃO) */}
      {mostrarGridRadarDisparo && (
        <FloatingAssertivePatternGrid
          spins={spins}
          padroes={padroes}
          setores={setores}
          onSelectNumber={registrarNumero}
          alerts={unifiedAlertData.alerts}
          confluence={unifiedAlertData.confluence}
          isGridNormalVisible={mostrarGridNotificacaoNormal}
          onToggleGridNormal={toggleGridNotificacaoNormal}
          onClose={() => {
            setMostrarGridRadarDisparo(false);
            try {
              localStorage.setItem("roleta_mostrar_radar_disparo", "false");
            } catch {}
          }}
        />
      )}

      {/* GRID FLUTUANTE DESLOCÁVEL 3-EM-1 QUÂNTICO (VERDE NEON VÍVIDO COM FUNDO RAJADO DE AZUL MARINHO E PARAFUSOS METAL) */}
      {mostrarGridQuantumConfluence && (
        <FloatingQuantumConfluenceGrid
          spins={spins}
          onSelectNumber={registrarNumero}
          onClose={() => setMostrarGridQuantumConfluence(false)}
        />
      )}

      {/* RADAR DE PADRÕES FLUTUANTE (ANALISADOR ESTATÍSTICO - APENAS MINI GRÁFICO DE COMBINAÇÕES) */}
      {mostrarRadarPadroes && (
        <RadarPadroesFlutuante
          externalNumbers={spins.map((s) => s.num)}
          onAddNumber={registrarNumero}
          alerts={alertsParaRadarPadroes}
          tacticalPatternAlert={radarDisparoAlert}
          onOpenRadarQuantitativo={() => setMostrarRadarQuantitativo(true)}
          onClose={() => {
            setMostrarRadarPadroes(false);
            try {
              localStorage.setItem("roleta_mostrar_radar_padroes", "false");
            } catch {}
          }}
        />
      )}

      {/* RADAR QUANTITATIVO FLUTUANTE SEPARADO (SINAIS QUALIFICADOS EXPERT & MÁXIMO +EV) */}
      {mostrarRadarQuantitativo && (
        <RadarQuantitativoPanel
          externalNumbers={spins.map((s) => s.num)}
          onAddNumber={registrarNumero}
          alerts={alertsParaRadarPadroes}
          tacticalPatternAlert={radarDisparoAlert}
          onClose={() => {
            setMostrarRadarQuantitativo(false);
            try {
              localStorage.setItem("roleta_mostrar_radar_quantitativo", "false");
            } catch {}
          }}
        />
      )}

      {/* TECLADO DE DIGITAÇÃO FIXO NA HORIZONTAL NO RODAPÉ (5 NÚMEROS POR LINHA COMEÇANDO NO ZERO) */}
      <FixedKeypadDock
        onPick={registrarNumero}
        onUndo={undo}
        spins={spins}
        ultimo={ultimo}
        onToggle={(open) => setKeypadDockOpen(open)}
        gestaoOperacional={gestaoOperacional}
      />
    </div>
  );
}

const CORES_DUPLA = {
  magenta: "border-neon-magenta/70 text-neon-magenta",
  cyan: "border-neon-cyan/70 text-neon-cyan",
  gold: "border-neon-gold/70 text-neon-gold",
  green: "border-neon-green/70 text-neon-green",
  red: "border-neon-red/70 text-neon-red",
  white: "border-white/60 text-white",
} as const;

/** Cada informação em dupla: rótulo pequeno + valor em cor definida */
function Dupla({
  rotulo,
  valor,
  cor,
}: {
  rotulo: string;
  valor: string;
  cor: keyof typeof CORES_DUPLA;
}) {
  return (
    <div className={`min-w-0 rounded-md border bg-background/70 px-2 py-1 ${CORES_DUPLA[cor]}`}>
      <div className="text-[9px] uppercase tracking-wide opacity-80">{rotulo}</div>
      <div className="truncate font-display text-sm font-black">{valor}</div>
    </div>
  );
}

function Quant({ label, valor, ok }: { label: string; valor: string; ok: boolean }) {

  return (
    <div
      className={`rounded-md border px-1.5 py-1 ${
        ok ? "border-neon-green/60 bg-neon-green/10" : "border-border bg-card/60"
      }`}
    >
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div
        className={`font-display text-sm font-black ${ok ? "text-neon-green" : "text-foreground"}`}
      >
        {valor}
      </div>
    </div>
  );
}
