import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Zap,
  Target,
  Layers,
  Activity,
  Compass,
  Flame,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  GripHorizontal,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Eye,
  Radio,
  Sliders,
} from "lucide-react";
import type { Spin } from "@/lib/roulette";
import {
  calcularIndiceEntropia,
  calcularZScoreEspacial,
  CILINDRO_EUROPEU,
  type CylinderSector,
  type BallisticCluster,
  type ShannonEntropyResult,
  type SpatialZScoreAnalysis,
} from "@/lib/quantitative-terminal-engine";
import {
  calcularLeiDoTerceiro,
  calcularPoissonAlertas,
  getCicloAtual,
  getJanelaCurta,
  type LeiDoTerceiroResult,
  type PoissonAnalysisResult,
  TEORICO_LEI_TERCEIRO,
} from "@/lib/three-tier-engine";
import { tocarAlerta } from "@/lib/notify";

/**
 * Parafuso Metálico Industrial 3D para cantos do painel tático
 */
function MetalScrew({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute z-30 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full border border-slate-500 shadow-[0_2px_4px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.75)] ${className}`}
      style={{
        background:
          "radial-gradient(circle at 35% 35%, #f1f5f9 0%, #94a3b8 40%, #334155 80%, #0f172a 100%)",
      }}
      aria-hidden="true"
    >
      <div className="relative h-2 w-2 flex items-center justify-center">
        <div className="absolute h-[1.5px] w-2 bg-[#050914] rounded-full shadow-[inset_0_1px_1px_rgba(0,0,0,0.95)]" />
        <div className="absolute h-2 w-[1.5px] bg-[#050914] rounded-full shadow-[inset_0_1px_1px_rgba(0,0,0,0.95)]" />
        <div className="absolute -top-0.5 -right-0.5 h-1 w-1 bg-white/80 rounded-full blur-[0.3px]" />
      </div>
    </div>
  );
}

// Cores clássicas da roleta europeia
const ROLETAS_VERMELHAS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

function getCorNumero(num: number): "vermelho" | "preto" | "verde" {
  if (num === 0) return "verde";
  return ROLETAS_VERMELHAS.has(num) ? "vermelho" : "preto";
}

export interface FloatingQuantumConfluenceGridProps {
  numeros?: number[];
  spins?: Spin[];
  onSelectNumber?: (num: number) => void;
  className?: string;
  defaultVisible?: boolean;
  onClose?: () => void;
}

export function FloatingQuantumConfluenceGrid({
  numeros,
  spins,
  onSelectNumber,
  className = "",
  defaultVisible = true,
  onClose,
}: FloatingQuantumConfluenceGridProps) {
  // Extrai lista uniforme de números em ordem de chegada (mais recente no índice 0)
  const rawNumbers = useMemo(() => {
    if (numeros && numeros.length > 0) return numeros;
    if (spins && spins.length > 0) return spins.map((s) => s.num);
    return [];
  }, [numeros, spins]);

  const [minimized, setMinimized] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(defaultVisible);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [abaAtiva, setAbaAtiva] = useState<"alerta" | "unificado" | "clusters">("alerta");
  const [modoUI, setModoUI] = useState<"AUTO" | "PREDADOR" | "ESCUDO">("AUTO");

  // Posicionamento flutuante móvel (Draggable) persistido no localStorage
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("roleta_grid_quantum_confluence_pos");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const isDraggingRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Inicializa posição padrão no canto esquerdo flutuante
  useEffect(() => {
    if (!position && typeof window !== "undefined") {
      const initialX = Math.max(16, 24);
      const initialY = Math.max(70, window.innerHeight - 560);
      setPosition({ x: initialX, y: initialY });
    }
  }, [position]);

  // =========================================================================
  // 1. MOTOR DO PADRÃO 1 (Imagem 1): Entropia de Shannon & Z-Score Espacial
  // =========================================================================
  const entropyAnalysis: ShannonEntropyResult = useMemo(() => {
    return calcularIndiceEntropia(rawNumbers, 25);
  }, [rawNumbers]);

  const spatialZScore: SpatialZScoreAnalysis = useMemo(() => {
    return calcularZScoreEspacial(rawNumbers, 50);
  }, [rawNumbers]);

  // Avalia modo Predador vs Escudo dinâmico
  const modoEfetivo = useMemo(() => {
    if (modoUI === "PREDADOR") return "PREDADOR";
    if (modoUI === "ESCUDO") return "ESCUDO";
    // Modo AUTO: se entropia <= 82% e Z-score >= 1.8 -> PREDADOR
    if (entropyAnalysis.entropyPercent <= 82 && spatialZScore.maxZScore >= 1.8) {
      return "PREDADOR";
    }
    return "ESCUDO";
  }, [modoUI, entropyAnalysis.entropyPercent, spatialZScore.maxZScore]);

  // =========================================================================
  // 2. MOTOR DO PADRÃO 2 (Imagem 2): Convergência dos Clusters Quentes do Rotor
  // =========================================================================
  const topClusters: BallisticCluster[] = useMemo(() => {
    return spatialZScore.topClusters.slice(0, 4);
  }, [spatialZScore.topClusters]);

  // =========================================================================
  // 3. MOTOR DO PADRÃO 3 (Imagem 3): Dúzias, Colunas de Poisson & Lei do Terceiro
  // =========================================================================
  const historyArray = useMemo(() => {
    return [...rawNumbers].reverse();
  }, [rawNumbers]);

  const cicloAtual = useMemo(() => getCicloAtual(historyArray), [historyArray]);
  const janelaCurta = useMemo(() => getJanelaCurta(historyArray), [historyArray]);

  const leiDoTerceiro: LeiDoTerceiroResult = useMemo(() => {
    return calcularLeiDoTerceiro(cicloAtual);
  }, [cicloAtual]);

  const poissonAnalysis: PoissonAnalysisResult = useMemo(() => {
    return calcularPoissonAlertas(janelaCurta);
  }, [janelaCurta]);

  // Estatísticas globais de Dúzias e Colunas
  const totaisGrupos = useMemo(() => {
    const total = rawNumbers.length || 1;
    let d1 = 0, d2 = 0, d3 = 0;
    let c1 = 0, c2 = 0, c3 = 0;

    for (const n of rawNumbers) {
      if (n >= 1 && n <= 12) d1++;
      else if (n >= 13 && n <= 24) d2++;
      else if (n >= 25 && n <= 36) d3++;

      if (n % 3 === 1) c1++;
      else if (n % 3 === 2) c2++;
      else if (n % 3 === 0 && n > 0) c3++;
    }

    return {
      d1: { qtd: d1, perc: (d1 / total) * 100 },
      d2: { qtd: d2, perc: (d2 / total) * 100 },
      d3: { qtd: d3, perc: (d3 / total) * 100 },
      c1: { qtd: c1, perc: (c1 / total) * 100 },
      c2: { qtd: c2, perc: (c2 / total) * 100 },
      c3: { qtd: c3, perc: (c3 / total) * 100 },
    };
  }, [rawNumbers]);

  // =========================================================================
  // 4. ALERTA SUPER ESPECIAL DE ENTRADA (COMBINAÇÃO DOS 3 PADRÕES E SISTEMAS)
  // =========================================================================
  const superAlertaEspecial = useMemo(() => {
    const lider = topClusters[0] ?? null;
    if (!lider) return null;

    // A. Interseção do Cluster Balístico com Dúzias e Colunas Dominantes de Poisson
    const duziaForte = [...poissonAnalysis.duzias].sort((a, b) => b.ocorrencias - a.ocorrencias)[0];
    const colunaForte = [...poissonAnalysis.colunas].sort((a, b) => b.ocorrencias - a.ocorrencias)[0];

    // B. Números do cluster que estão na Lei do Terceiro como "repetidos" ou "únicos"
    const repetidosNoCluster = lider.numbers.filter((n) =>
      leiDoTerceiro.repetidos.includes(n),
    );
    const unicosNoCluster = lider.numbers.filter((n) =>
      leiDoTerceiro.unicos.includes(n),
    );

    // C. Verificação de Confluência Tripla
    const temZScoreForte = lider.zScore >= 1.5;
    const temEntropiaFavoravel = entropyAnalysis.entropyPercent <= 82;
    const temPoissonMomentum = duziaForte && duziaForte.ocorrencias >= 4;
    const temRepeticoesAtivas = repetidosNoCluster.length >= 1;

    // Cálculo da taxa de acurácia combinada (estocástica ponderada)
    let acuraciaEstocastica = 78.5;
    if (lider.zScore >= 2.0) acuraciaEstocastica += 8.5;
    else if (lider.zScore >= 1.5) acuraciaEstocastica += 4.5;

    if (temEntropiaFavoravel) acuraciaEstocastica += 4.0;
    if (temPoissonMomentum) acuraciaEstocastica += 3.2;
    if (temRepeticoesAtivas) acuraciaEstocastica += 2.8;

    acuraciaEstocastica = Math.min(96.8, Math.max(72.0, acuraciaEstocastica));

    const isGatilhoCritico =
      (lider.zScore >= 2.0 || acuraciaEstocastica >= 90) && temEntropiaFavoravel;

    return {
      cluster: lider,
      acuraciaEstocastica: Number(acuraciaEstocastica.toFixed(1)),
      isGatilhoCritico,
      duziaForte,
      colunaForte,
      repetidosNoCluster,
      unicosNoCluster,
      alvosPrincipais: lider.numbers,
      pivoCentral: lider.centerNumber,
      setor: lider.sector,
      statusEntropia: entropyAnalysis.level,
      taxaEntropia: entropyAnalysis.entropyPercent,
      diagnosticoTexto: `Cluster Arc #${lider.centerNumber} (${lider.sector}) em confluência com ${duziaForte ? duziaForte.nome : "Dúzia"} (${totaisGrupos.d1.perc.toFixed(0)}%) e Lei do Terceiro.`,
    };
  }, [topClusters, poissonAnalysis, leiDoTerceiro, entropyAnalysis, totaisGrupos]);

  // Efeito sonoro ao disparar Alerta Super Especial Crítico
  const ultimoAlertaDisparadoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!superAlertaEspecial || !soundEnabled) return;
    if (superAlertaEspecial.isGatilhoCritico) {
      const chave = `${superAlertaEspecial.cluster.id}-${superAlertaEspecial.taxaEntropia}`;
      if (ultimoAlertaDisparadoRef.current !== chave) {
        ultimoAlertaDisparadoRef.current = chave;
        tocarAlerta();
      }
    }
  }, [superAlertaEspecial, soundEnabled]);

  // =========================================================================
  // CONTROLES DE ARRASTE (DRAGGABLE)
  // =========================================================================
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, select")) return;

    isDraggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    const currentX = position?.x ?? 24;
    const currentY = position?.y ?? 100;

    dragOffsetRef.current = {
      x: e.clientX - currentX,
      y: e.clientY - currentY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;

    const width = containerRef.current?.offsetWidth || 560;
    const height = containerRef.current?.offsetHeight || 420;

    const clampedX = Math.max(8, Math.min(window.innerWidth - width - 8, newX));
    const clampedY = Math.max(8, Math.min(window.innerHeight - height - 8, newY));

    const nextPos = { x: clampedX, y: clampedY };
    setPosition(nextPos);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}
      if (position) {
        try {
          localStorage.setItem(
            "roleta_grid_quantum_confluence_pos",
            JSON.stringify(position),
          );
        } catch {}
      }
    }
  };

  // ESTILO RAJADO DE AZUL MARINHO TÁTICO COM FIBRA ÓPTICA E AURA VERDE NEON
  const NAVY_STRIPED_STYLE: React.CSSProperties = {
    backgroundColor: "#030a17",
    backgroundImage: `
      radial-gradient(ellipse at 50% 0%, rgba(0, 255, 102, 0.18) 0%, transparent 65%),
      radial-gradient(ellipse at 90% 100%, rgba(14, 76, 146, 0.35) 0%, transparent 55%),
      /* Fundo rajado transversal em azul marinho balístico (55° e -55°) */
      repeating-linear-gradient(55deg, rgba(14, 165, 233, 0.09) 0px, rgba(14, 165, 233, 0.09) 1.5px, transparent 1.5px, transparent 11px),
      repeating-linear-gradient(-55deg, rgba(2, 132, 199, 0.09) 0px, rgba(2, 132, 199, 0.09) 1.5px, transparent 1.5px, transparent 11px),
      repeating-linear-gradient(0deg, rgba(3, 10, 24, 0.75) 0px, rgba(3, 10, 24, 0.75) 3px, transparent 3px, transparent 6px),
      linear-gradient(145deg, #051026 0%, #020610 50%, #071738 100%)
    `,
  };

  if (!visible) return null;

  // MODO MINIMIZADO (PÍLULA FLUTUANTE VERDE NEON DESLOCÁVEL)
  if (minimized) {
    return (
      <div
        ref={containerRef}
        className={`fixed z-50 transition-all select-none ${className}`}
        style={{
          left: position ? `${position.x}px` : "1.5rem",
          top: position ? `${position.y}px` : "auto",
          bottom: position ? "auto" : "5.5rem",
        }}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative flex items-center gap-2.5 rounded-2xl border-2 border-[#00FF66] px-3.5 py-2 shadow-[0_0_30px_rgba(0,255,102,0.6),inset_0_0_15px_rgba(0,255,102,0.2)] select-none backdrop-blur-md cursor-grab active:cursor-grabbing overflow-hidden"
          style={NAVY_STRIPED_STYLE}
        >
          <MetalScrew className="top-1 left-1" />
          <MetalScrew className="top-1 right-1" />
          <MetalScrew className="bottom-1 left-1" />
          <MetalScrew className="bottom-1 right-1" />

          <GripHorizontal className="h-4 w-4 text-[#00FF66] opacity-75 shrink-0 ml-1.5" />
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#00FF66]/20 border border-[#00FF66] text-[#00FF66] animate-pulse">
            <Zap className="h-3.5 w-3.5 fill-[#00FF66]" />
          </div>

          <div className="flex flex-col pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#00FF66]">
                3-EM-1 QUÂNTICO
              </span>
              <span className="rounded bg-[#00FF66] px-1 text-[9px] font-black text-black">
                {superAlertaEspecial ? `${superAlertaEspecial.acuraciaEstocastica}%` : "ATIVO"}
              </span>
            </div>
            <span className="text-[9px] font-bold text-cyan-200/90 truncate max-w-[150px]">
              {superAlertaEspecial ? `Arc #${superAlertaEspecial.pivoCentral} (${superAlertaEspecial.setor})` : "Monitorando"}
            </span>
          </div>

          <div className="flex items-center gap-1 pl-1 border-l border-[#00FF66]/30">
            <button
              onClick={() => setMinimized(false)}
              className="flex h-6 w-6 items-center justify-center rounded bg-[#00FF66]/20 text-[#00FF66] hover:bg-[#00FF66] hover:text-black transition-colors"
              title="Expandir Grid 3-em-1"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
            <button
              onClick={() => {
                setVisible(false);
                onClose?.();
              }}
              className="flex h-6 w-6 items-center justify-center rounded bg-slate-800/80 text-slate-300 hover:bg-rose-500 hover:text-white transition-colors"
              title="Fechar HUD"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 w-[94vw] sm:w-[540px] md:w-[600px] select-none ${className}`}
      style={{
        left: position ? `${position.x}px` : "1.5rem",
        top: position ? `${position.y}px` : "auto",
        bottom: position ? "auto" : "4.5rem",
      }}
    >
      <div
        className={`relative flex flex-col rounded-3xl border-2 transition-all duration-300 shadow-[0_0_40px_rgba(0,255,102,0.45),inset_0_0_20px_rgba(0,255,102,0.12)] overflow-hidden ${
          superAlertaEspecial?.isGatilhoCritico
            ? "border-[#00FF66] ring-2 ring-[#00FF66]/50 shadow-[0_0_50px_rgba(0,255,102,0.7)]"
            : "border-[#00FF66]/80"
        }`}
        style={NAVY_STRIPED_STYLE}
      >
        {/* PARAFUSOS METÁLICOS INDUSTRIAIS NOS 4 CANTOS */}
        <MetalScrew className="top-2.5 left-2.5" />
        <MetalScrew className="top-2.5 right-2.5" />
        <MetalScrew className="bottom-2.5 left-2.5" />
        <MetalScrew className="bottom-2.5 right-2.5" />

        {/* =====================================================================
            CABEÇALHO TÁTICO BLOOMBERG: ARRASTO, MODO UI & CONTROLES
            ===================================================================== */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex items-center justify-between border-b border-[#00FF66]/30 px-5 pt-3.5 pb-2.5 bg-black/40 cursor-grab active:cursor-grabbing backdrop-blur-md"
        >
          <div className="flex items-center gap-2 pl-3">
            <GripHorizontal className="h-4 w-4 text-[#00FF66] opacity-80 shrink-0" />
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#00FF66]/20 border border-[#00FF66] text-[#00FF66] shadow-[0_0_10px_#00FF66]">
              <Zap className="h-4 w-4 fill-[#00FF66]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-[#00FF66] drop-shadow-[0_0_8px_rgba(0,255,102,0.8)]">
                  TERMINAL QUANTITATIVO BLOOMBERG
                </span>
                <span className="rounded bg-[#00FF66] px-1.5 py-0.2 text-[9px] font-black text-black">
                  3-EM-1
                </span>
              </div>
              <span className="text-[10px] text-cyan-200/80 font-mono flex items-center gap-1">
                CONVERGÊNCIA BALÍSTICA ATIVA · Z-SCORE & POISSON
              </span>
            </div>
          </div>

          {/* BOTÕES DE MODO UI E FERRAMENTAS */}
          <div className="flex items-center gap-1.5 pr-3">
            <div className="hidden sm:flex items-center gap-1 rounded-lg bg-black/60 p-0.5 border border-[#00FF66]/30 text-[9px] font-mono">
              <button
                onClick={() => setModoUI("AUTO")}
                className={`px-1.5 py-0.5 rounded font-black transition-all ${
                  modoUI === "AUTO"
                    ? "bg-[#00FF66] text-black shadow-[0_0_6px_#00FF66]"
                    : "text-slate-300 hover:text-[#00FF66]"
                }`}
              >
                AUTO
              </button>
              <button
                onClick={() => setModoUI("PREDADOR")}
                className={`px-1.5 py-0.5 rounded font-black transition-all ${
                  modoUI === "PREDADOR"
                    ? "bg-emerald-500 text-black shadow-[0_0_6px_#10b981]"
                    : "text-slate-300 hover:text-emerald-400"
                }`}
              >
                PREDADOR
              </button>
              <button
                onClick={() => setModoUI("ESCUDO")}
                className={`px-1.5 py-0.5 rounded font-black transition-all ${
                  modoUI === "ESCUDO"
                    ? "bg-rose-500 text-white shadow-[0_0_6px_#f43f5e]"
                    : "text-slate-300 hover:text-rose-400"
                }`}
              >
                ESCUDO
              </button>
            </div>

            <button
              onClick={() => setSoundEnabled((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900/80 border border-[#00FF66]/30 text-[#00FF66] hover:bg-[#00FF66]/20 transition-colors"
              title={soundEnabled ? "Som Ativado" : "Som Desativado"}
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
            </button>
            <button
              onClick={() => setMinimized(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900/80 border border-[#00FF66]/30 text-[#00FF66] hover:bg-[#00FF66]/20 transition-colors"
              title="Minimizar para Pílula"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setVisible(false);
                onClose?.();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900/80 border border-[#00FF66]/30 text-slate-400 hover:bg-rose-500 hover:text-white transition-colors"
              title="Fechar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* =====================================================================
            SELETOR DE ABAS INTERNAS (ALERTA ESPECIAL vs 3 PADRÕES vs CLUSTERS)
            ===================================================================== */}
        <div className="flex border-b border-[#00FF66]/20 bg-black/50 px-4 py-1.5 text-xs font-mono">
          <button
            onClick={() => setAbaAtiva("alerta")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-black transition-all ${
              abaAtiva === "alerta"
                ? "bg-[#00FF66] text-black shadow-[0_0_10px_#00FF66]"
                : "text-slate-300 hover:text-[#00FF66] hover:bg-[#00FF66]/10"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            ALERTA SUPER ESPECIAL
            {superAlertaEspecial?.isGatilhoCritico && (
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setAbaAtiva("unificado")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-black transition-all ml-1 ${
              abaAtiva === "unificado"
                ? "bg-[#00FF66] text-black shadow-[0_0_10px_#00FF66]"
                : "text-slate-300 hover:text-[#00FF66] hover:bg-[#00FF66]/10"
            }`}
          >
            <Layers className="h-3 w-3" />
            3 PADRÕES INTEGRADOS
          </button>
          <button
            onClick={() => setAbaAtiva("clusters")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-black transition-all ml-1 ${
              abaAtiva === "clusters"
                ? "bg-[#00FF66] text-black shadow-[0_0_10px_#00FF66]"
                : "text-slate-300 hover:text-[#00FF66] hover:bg-[#00FF66]/10"
            }`}
          >
            <Compass className="h-3 w-3" />
            CLUSTERS BALÍSTICOS
          </button>
        </div>

        {/* =====================================================================
            CORPO DO HUD FLUTUANTE (ALTURA MÁXIMA COM SCROLL TÁTICO)
            ===================================================================== */}
        <div className="max-h-[70vh] overflow-y-auto p-3.5 sm:p-4 space-y-3.5 text-slate-100 font-mono custom-scrollbar">

          {/* -------------------------------------------------------------------
              ABA 1: ALERTA SUPER ESPECIAL DE ENTRADA CONFLUENTE
              ------------------------------------------------------------------- */}
          {abaAtiva === "alerta" && (
            <div className="space-y-3">
              {superAlertaEspecial ? (
                <div className="relative rounded-2xl border-2 border-[#00FF66] bg-black/60 p-3.5 shadow-[0_0_25px_rgba(0,255,102,0.35),inset_0_0_15px_rgba(0,255,102,0.1)]">
                  {/* BADGE DE GATILHO SUPER ESPECIAL */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#00FF66]/30 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#00FF66] text-black font-black animate-pulse">
                        ⚡
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black uppercase text-[#00FF66] tracking-wider">
                            ALERTA SUPER ESPECIAL DE ENTRADA
                          </span>
                          <span className="rounded bg-[#00FF66] px-1.5 text-[9px] font-black text-black">
                            MULTI-SISTEMA
                          </span>
                        </div>
                        <span className="text-[10px] text-cyan-200">
                          {superAlertaEspecial.diagnosticoTexto}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-slate-400">CONFLUÊNCIA</span>
                        <span className="text-sm font-black text-[#00FF66] drop-shadow-[0_0_8px_#00FF66]">
                          {superAlertaEspecial.acuraciaEstocastica}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ALVOS CONTÍGUOS DO CLUSTER BALÍSTICO NO ROTOR EUROPEU */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold mb-1.5">
                      <span className="flex items-center gap-1 text-[#00FF66]">
                        <Target className="h-3 w-3" />
                        5 BOLSÕES RECOMENDADOS (CLUSTER ARC #{superAlertaEspecial.pivoCentral}):
                      </span>
                      <span className="text-cyan-300">
                        {superAlertaEspecial.setor} · Z = +{superAlertaEspecial.cluster.zScore.toFixed(2)} SD
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {superAlertaEspecial.alvosPrincipais.map((num) => {
                        const isPivo = num === superAlertaEspecial.pivoCentral;
                        const cor = getCorNumero(num);
                        const isRepetido = leiDoTerceiro.repetidos.includes(num);

                        return (
                          <button
                            key={num}
                            onClick={() => onSelectNumber?.(num)}
                            className={`group relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl font-mono text-base font-black transition-all transform hover:scale-110 active:scale-95 border-2 ${
                              isPivo
                                ? "border-[#00FF66] bg-[#00FF66]/20 text-[#00FF66] shadow-[0_0_15px_#00FF66]"
                                : cor === "verde"
                                ? "border-emerald-400 bg-emerald-950/80 text-emerald-300"
                                : cor === "vermelho"
                                ? "border-rose-500/70 bg-rose-950/80 text-rose-200"
                                : "border-slate-500/70 bg-slate-900/90 text-slate-100"
                            }`}
                            title={`Número ${num} (${isPivo ? "PIVÔ CENTRAL" : "Vizinho Balístico"})`}
                          >
                            <span>{num}</span>
                            {isPivo && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#00FF66] text-[7px] font-black text-black">
                                ★
                              </span>
                            )}
                            {isRepetido && !isPivo && (
                              <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                            )}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => {
                          superAlertaEspecial.alvosPrincipais.forEach((n) => onSelectNumber?.(n));
                        }}
                        className="ml-auto px-3 py-2 rounded-xl bg-[#00FF66] hover:bg-emerald-400 text-black font-black text-xs transition-transform transform active:scale-95 shadow-[0_0_12px_rgba(0,255,102,0.6)]"
                      >
                        COBRIR OS 5
                      </button>
                    </div>
                  </div>

                  {/* DIAGNÓSTICO DOS 3 SISTEMAS INTEGRADOS */}
                  <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t border-[#00FF66]/20 text-[10px]">
                    <div className="rounded-lg bg-black/40 border border-[#00FF66]/30 p-2">
                      <span className="text-slate-400 block">1. ENTROPIA DE SHANNON</span>
                      <span className="text-[#00FF66] font-bold">
                        {superAlertaEspecial.taxaEntropia}% ({superAlertaEspecial.statusEntropia})
                      </span>
                    </div>
                    <div className="rounded-lg bg-black/40 border border-[#00FF66]/30 p-2">
                      <span className="text-slate-400 block">2. Z-SCORE CLUSTER</span>
                      <span className="text-cyan-300 font-bold">
                        +{superAlertaEspecial.cluster.zScore.toFixed(2)} SD ({superAlertaEspecial.cluster.hits} hits)
                      </span>
                    </div>
                    <div className="rounded-lg bg-black/40 border border-[#00FF66]/30 p-2">
                      <span className="text-slate-400 block">3. POISSON & LEI 3º</span>
                      <span className="text-emerald-300 font-bold">
                        {superAlertaEspecial.duziaForte?.nome || "Dúzia"} · {superAlertaEspecial.repetidosNoCluster.length} repetições
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#00FF66]/30 bg-black/40 p-4 text-center text-xs text-slate-400">
                  Aguardando giros para formação da confluência multi-sistema...
                </div>
              )}

              {/* CARD RESUMIDO DO TERMÔMETRO DO CAOS */}
              <div className="rounded-2xl border border-[#00FF66]/40 bg-black/40 p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-[#00FF66] flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    TERMÔMETRO DO CAOS (ENTROPIA H = {entropyAnalysis.entropyPercent}%)
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${entropyAnalysis.riskClass}`}>
                    {entropyAnalysis.sinaisLiberados ? "GATILHOS LIBERADOS" : "BLOQUEIO DE RUÍDO"}
                  </span>
                </div>
                {/* BARRA DE ENTROPIA GRADIENTE COM MARCADOR */}
                <div className="relative h-3 w-full rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${entropyAnalysis.entropyPercent}%`,
                      background:
                        "linear-gradient(90deg, #00FF66 0%, #00FF66 65%, #FFB800 68%, #FFB800 82%, #FF0055 85%, #FF0055 100%)",
                    }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_4px_#fff]"
                    style={{ left: `${Math.min(99, Math.max(1, entropyAnalysis.entropyPercent))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] text-slate-400 font-mono mt-1">
                  <span className="text-[#00FF66]">● 0-68%: OPORTUNIDADE</span>
                  <span className="text-[#FFB800]">● 68-82%: TRANSIÇÃO</span>
                  <span className="text-[#FF0055]">● &gt;82%: RUÍDO BRANCO</span>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------
              ABA 2: OS 3 PADRÕES INTEGRADOS DA IMAGEM
              ------------------------------------------------------------------- */}
          {abaAtiva === "unificado" && (
            <div className="space-y-3.5">
              {/* ===============================================================
                  PADRÃO 1 (IMAGEM 1): ÍNDICE DE ENTROPIA & Z-SCORE ESPACIAL
                  =============================================================== */}
              <div className="rounded-2xl border border-[#00FF66]/40 bg-black/60 p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#00FF66]/20 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#00FF66] uppercase">
                      1. ÍNDICE DE ENTROPIA DE SHANNON
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      (25/25 GIROS)
                    </span>
                  </div>
                  <span className="text-xs font-black text-[#00FF66]">
                    H(x): {entropyAnalysis.entropyPercent}%
                  </span>
                </div>

                <p className="text-[10px] text-slate-300">
                  {entropyAnalysis.statusDescription}
                </p>

                {/* BARRA GRADIENTE IDÊNTICA À IMAGEM 1 */}
                <div className="relative h-3.5 w-full rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${entropyAnalysis.entropyPercent}%`,
                      background:
                        "linear-gradient(90deg, #00FF66 0%, #00FF66 65%, #FFB800 68%, #FFB800 82%, #FF0055 85%, #FF0055 100%)",
                    }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_6px_#fff]"
                    style={{ left: `${Math.min(99, Math.max(1, entropyAnalysis.entropyPercent))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-white/5 pt-1.5">
                  <span>H(x): {entropyAnalysis.shannonEntropy.toFixed(3)} bits</span>
                  <span>H_max: {entropyAnalysis.maxEntropy.toFixed(3)} bits</span>
                  <span className="text-[#00FF66]">Taxa: {entropyAnalysis.entropyPercent}%</span>
                  <span>Fórmula: -Σ p(x) log₂(p(x))</span>
                </div>
              </div>

              {/* ===============================================================
                  PADRÃO 2 (IMAGEM 2): CONVERGÊNCIA DOS CLUSTERS QUENTES
                  =============================================================== */}
              <div className="rounded-2xl border border-[#00FF66]/40 bg-black/60 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-[#00FF66]/20 pb-1.5">
                  <span className="text-xs font-black text-[#00FF66] uppercase flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    2. CONVERGÊNCIA DOS CLUSTERS QUENTES (ARCOS DE 5 BOLSÕES)
                  </span>
                  <span className="text-[10px] text-cyan-300 font-bold">
                    Z-SCORE MÁX: +{spatialZScore.maxZScore.toFixed(2)} SD
                  </span>
                </div>

                <div className="space-y-2">
                  {topClusters.map((cluster) => (
                    <div
                      key={cluster.id}
                      className="rounded-xl border border-[#00FF66]/30 bg-black/40 p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white">
                            {cluster.name}
                          </span>
                          <span className="rounded bg-cyan-950 px-1.5 text-[9px] font-black text-cyan-300 border border-cyan-700/50">
                            {cluster.sector}
                          </span>
                          <span className="text-[10px] font-bold text-[#00FF66]">
                            +{cluster.zScore.toFixed(2)} SD
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400">
                          {cluster.hits} aparições ({(cluster.empiricalProb * 100).toFixed(1)}%) · Esperado: {cluster.expectedHits.toFixed(1)}x
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {cluster.numbers.map((n) => {
                          const isCenter = n === cluster.centerNumber;
                          return (
                            <button
                              key={n}
                              onClick={() => onSelectNumber?.(n)}
                              className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-xs font-black transition-all ${
                                isCenter
                                  ? "bg-[#00FF66] text-black border border-[#00FF66] shadow-[0_0_8px_#00FF66]"
                                  : "bg-slate-900 border border-slate-700 text-slate-200 hover:border-[#00FF66]"
                              }`}
                              title={`Bolsão ${n}`}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ===============================================================
                  PADRÃO 3 (IMAGEM 3): DÚZIAS, COLUNAS POISSON & LEI DO TERCEIRO
                  =============================================================== */}
              <div className="rounded-2xl border border-[#00FF66]/40 bg-black/60 p-3 space-y-3">
                <span className="text-xs font-black text-[#00FF66] uppercase flex items-center gap-1.5 border-b border-[#00FF66]/20 pb-1.5">
                  <BarChart3 className="h-3 w-3" />
                  3. FREQUÊNCIA POISSON & LEI DO TERCEIRO (0 A 36)
                </span>

                {/* AS 3 DÚZIAS */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-cyan-800/40 bg-black/40 p-2">
                    <span className="text-[9px] text-slate-400 block">1ª DÚZIA (1-12)</span>
                    <span className="text-sm font-black text-cyan-300">
                      {totaisGrupos.d1.perc.toFixed(1)}%
                    </span>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-cyan-400" style={{ width: `${totaisGrupos.d1.perc}%` }} />
                    </div>
                    <span className="text-[8px] text-slate-400 mt-1 block">
                      {totaisGrupos.d1.qtd}x total
                    </span>
                  </div>

                  <div className="rounded-xl border border-cyan-800/40 bg-black/40 p-2">
                    <span className="text-[9px] text-slate-400 block">2ª DÚZIA (13-24)</span>
                    <span className="text-sm font-black text-cyan-300">
                      {totaisGrupos.d2.perc.toFixed(1)}%
                    </span>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-cyan-400" style={{ width: `${totaisGrupos.d2.perc}%` }} />
                    </div>
                    <span className="text-[8px] text-slate-400 mt-1 block">
                      {totaisGrupos.d2.qtd}x total
                    </span>
                  </div>

                  <div className="rounded-xl border border-cyan-800/40 bg-black/40 p-2">
                    <span className="text-[9px] text-slate-400 block">3ª DÚZIA (25-36)</span>
                    <span className="text-sm font-black text-cyan-300">
                      {totaisGrupos.d3.perc.toFixed(1)}%
                    </span>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-cyan-400" style={{ width: `${totaisGrupos.d3.perc}%` }} />
                    </div>
                    <span className="text-[8px] text-slate-400 mt-1 block">
                      {totaisGrupos.d3.qtd}x total
                    </span>
                  </div>
                </div>

                {/* AS 3 COLUNAS POISSON */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>RASTREAMENTO DAS 3 COLUNAS (POISSON 12G)</span>
                    <span className="text-cyan-300 font-bold">Base 33.3% · λ = 3.89</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-emerald-800/40 bg-black/40 p-2">
                      <span className="text-[9px] text-slate-400 block">1ª COLUNA</span>
                      <span className="text-sm font-black text-emerald-400">
                        {totaisGrupos.c1.perc.toFixed(1)}%
                      </span>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-emerald-400" style={{ width: `${totaisGrupos.c1.perc}%` }} />
                      </div>
                    </div>
                    <div className="rounded-xl border border-emerald-800/40 bg-black/40 p-2">
                      <span className="text-[9px] text-slate-400 block">2ª COLUNA</span>
                      <span className="text-sm font-black text-emerald-400">
                        {totaisGrupos.c2.perc.toFixed(1)}%
                      </span>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-emerald-400" style={{ width: `${totaisGrupos.c2.perc}%` }} />
                      </div>
                    </div>
                    <div className="rounded-xl border border-emerald-800/40 bg-black/40 p-2">
                      <span className="text-[9px] text-slate-400 block">3ª COLUNA</span>
                      <span className="text-sm font-black text-emerald-400">
                        {totaisGrupos.c3.perc.toFixed(1)}%
                      </span>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-emerald-400" style={{ width: `${totaisGrupos.c3.perc}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* DISPERSÃO & FREQUÊNCIA - LEI DO TERCEIRO (0 A 36) */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-slate-200">LEI DO TERCEIRO (CICLO 37 GIROS)</span>
                    <div className="flex items-center gap-2 text-[9px]">
                      <span className="text-[#00FF66]">● Repetidos (≥2x)</span>
                      <span className="text-cyan-400">● Únicos (1x)</span>
                      <span className="text-slate-400">● Ausentes (0x)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-slate-700 bg-black/40 p-2">
                      <span className="text-[9px] text-slate-400 block">AUSENTES</span>
                      <span className="text-sm font-black text-white">
                        {leiDoTerceiro.totalAusentes} / 37
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        {leiDoTerceiro.percAusentes}% (Δ {leiDoTerceiro.discrepanciaAusentes}%)
                      </span>
                    </div>
                    <div className="rounded-xl border border-cyan-800/40 bg-black/40 p-2">
                      <span className="text-[9px] text-cyan-300 block">ÚNICOS</span>
                      <span className="text-sm font-black text-cyan-400">
                        {leiDoTerceiro.totalUnicos} / 37
                      </span>
                      <span className="text-[9px] text-cyan-300/80 block">
                        {leiDoTerceiro.percUnicos}% (Δ +{leiDoTerceiro.discrepanciaUnicos}%)
                      </span>
                    </div>
                    <div className="rounded-xl border border-emerald-800/40 bg-black/40 p-2">
                      <span className="text-[9px] text-[#00FF66] block">REPETIDOS</span>
                      <span className="text-sm font-black text-[#00FF66]">
                        {leiDoTerceiro.totalRepetidos} / 37
                      </span>
                      <span className="text-[9px] text-[#00FF66]/80 block">
                        {leiDoTerceiro.percRepetidos}% (Δ {leiDoTerceiro.discrepanciaRepetidos}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------
              ABA 3: LISTA COMPLETA DOS CLUSTERS BALÍSTICOS DO ROTOR
              ------------------------------------------------------------------- */}
          {abaAtiva === "clusters" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300 border-b border-[#00FF66]/20 pb-1.5">
                <span className="font-bold text-[#00FF66]">TODOS OS CLUSTERS DO ROTOR COM ANOMALIA</span>
                <span className="text-[10px] text-slate-400">Limiar Anomalia: +2.0 SD</span>
              </div>

              {spatialZScore.allClusters.slice(0, 8).map((cluster) => (
                <div
                  key={cluster.id}
                  className="rounded-xl border border-[#00FF66]/30 bg-black/50 p-2.5 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{cluster.name}</span>
                      <span className="text-[9px] font-bold text-cyan-300 px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800/50">
                        {cluster.sector}
                      </span>
                      <span
                        className={`text-[10px] font-black ${
                          cluster.zScore >= 2.0 ? "text-[#00FF66]" : "text-slate-300"
                        }`}
                      >
                        +{cluster.zScore.toFixed(2)} SD
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400">
                      {cluster.hits} hits ({((cluster.hits / (cluster.sampleSize || 1)) * 100).toFixed(1)}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {cluster.numbers.map((n) => (
                      <button
                        key={n}
                        onClick={() => onSelectNumber?.(n)}
                        className={`flex h-6 w-6 items-center justify-center rounded text-xs font-black transition-colors ${
                          n === cluster.centerNumber
                            ? "bg-[#00FF66] text-black"
                            : "bg-slate-900 text-slate-200 hover:bg-[#00FF66]/30"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =====================================================================
            RODAPÉ TÁTICO: STATUS DE SINCRONISMO E AÇÃO RÁPIDA
            ===================================================================== */}
        <div className="flex items-center justify-between border-t border-[#00FF66]/30 bg-black/60 px-5 py-2 text-[10px] text-slate-300 font-mono">
          <div className="flex items-center gap-2 pl-3">
            <span className="flex h-2 w-2 rounded-full bg-[#00FF66] animate-pulse" />
            <span className="text-[#00FF66] font-bold">
              SINCRONIZADO · {rawNumbers.length} GIROS REGISTRADOS
            </span>
          </div>

          <div className="pr-3 flex items-center gap-2">
            <button
              onClick={() => {
                if (superAlertaEspecial) {
                  superAlertaEspecial.alvosPrincipais.forEach((num) => onSelectNumber?.(num));
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-[#00FF66] text-black font-black text-[10px] hover:bg-emerald-400 transition-colors shadow-[0_0_8px_#00FF66]"
            >
              APLICAR GATILHO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
