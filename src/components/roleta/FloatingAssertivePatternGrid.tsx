import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Zap,
  Target,
  Layers,
  Columns3,
  X,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Flame,
  Radio,
  GripHorizontal,
  Sparkles,
  AlertTriangle,
  Eye,
  EyeOff,
  BellRing,
} from "lucide-react";
import type { Spin, SectorDef, Padrao } from "@/lib/roulette";
import { SETORES_PADRAO } from "@/lib/roulette";
import {
  CATALOGO_PADROES_TATICOS,
  findMostAssertivePatternAlert,
} from "@/lib/pattern-tracker-engine";
import type { UnifiedAlertItem, ConfluenceGroup } from "@/lib/alert-confluence";
import { corDoNumero } from "./TabRodaAoVivo";
import { tocarAlerta } from "@/lib/notify";

/**
 * Componente de Parafuso Metálico Industrial (3D realista com fenda chanfrada e brilho)
 */
function MetalScrew({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute z-30 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full border border-slate-600 shadow-[0_2px_4px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.7)] ${className}`}
      style={{
        background:
          "radial-gradient(circle at 35% 35%, #e2e8f0 0%, #94a3b8 35%, #475569 75%, #0f172a 100%)",
      }}
      aria-hidden="true"
    >
      {/* Fenda em cruz chanfrada com profundidade física */}
      <div className="relative h-2 w-2 flex items-center justify-center">
        <div className="absolute h-[1.5px] w-2 bg-[#090d16] rounded-full shadow-[inset_0_1px_1px_rgba(0,0,0,0.95)]" />
        <div className="absolute h-2 w-[1.5px] bg-[#090d16] rounded-full shadow-[inset_0_1px_1px_rgba(0,0,0,0.95)]" />
        <div className="absolute -top-0.5 -right-0.5 h-1 w-1 bg-white/70 rounded-full blur-[0.4px]" />
      </div>
    </div>
  );
}

export interface FloatingAssertivePatternGridProps {
  spins: Spin[];
  padroes?: Padrao[] | undefined;
  setores?: SectorDef[] | undefined;
  onSelectNumber?: ((num: number) => void) | undefined;
  className?: string | undefined;
  alerts?: UnifiedAlertItem[] | undefined;
  confluence?: ConfluenceGroup | null | undefined;
  isGridNormalVisible?: boolean | undefined;
  onToggleGridNormal?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
}

export function FloatingAssertivePatternGrid({
  spins,
  padroes = CATALOGO_PADROES_TATICOS,
  setores = SETORES_PADRAO,
  onSelectNumber,
  className = "",
  alerts = [],
  confluence = null,
  isGridNormalVisible = false,
  onToggleGridNormal,
  onClose,
}: FloatingAssertivePatternGridProps) {
  const [minimized, setMinimized] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [highlightPulse, setHighlightPulse] = useState<boolean>(false);
  const [abaAtiva, setAbaAtiva] = useState<"lider" | "alertas">("lider");

  // Posição flutuante deslocável (Draggable) com persistência em localStorage
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("roleta_grid_flutuante_pos");
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

  // Inicializa posição padrão no canto inferior direito
  useEffect(() => {
    if (!position && typeof window !== "undefined") {
      const width = Math.min(window.innerWidth - 32, 480);
      const initialX = Math.max(16, window.innerWidth - width - 24);
      const initialY = Math.max(70, window.innerHeight - 440);
      setPosition({ x: initialX, y: initialY });
    }
  }, [position]);

  // Calcula o padrão mais assertivo entre todos os padrões
  const alertData = useMemo(() => {
    return findMostAssertivePatternAlert(spins, padroes, setores);
  }, [spins, padroes, setores]);

  // Detecta se há alerta crítico ativo (>60% acerto ou alerta de alta prioridade)
  const isCritico = useMemo(() => {
    if (alertData && alertData.probabilidadeAcertos >= 60 && alertData.temAlertaAtivo) return true;
    if (alerts && alerts.some((a) => a.priority >= 90 || a.accuracy2Entries >= 70 || a.isReinforced)) return true;
    return false;
  }, [alertData, alerts]);

  // Filtro Estrito: Apenas Sinais Expert e Nível Máximo (Elimina ruídos menores)
  const alertasFiltrados = useMemo(() => {
    return (alerts || []).filter(
      (a) => a.priority >= 85 || (a.accuracy2Entries ?? 0) >= 75 || a.isReinforced
    );
  }, [alerts]);

  const totalOcultados = (alerts || []).length - alertasFiltrados.length;

  const lastPeakRef = useRef<{ code: string; taxa: number; total: number } | null>(null);

  // Efeito sonoro e pulso quando surge um novo pico ou alerta crítico
  useEffect(() => {
    if (!alertData) return undefined;

    const prev = lastPeakRef.current;
    const isNew =
      !prev ||
      prev.code !== alertData.padraoLider.code ||
      alertData.probabilidadeAcertos > prev.taxa ||
      alertData.totalGreens > prev.total;

    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isNew && alertData.temAlertaAtivo) {
      lastPeakRef.current = {
        code: alertData.padraoLider.code,
        taxa: alertData.probabilidadeAcertos,
        total: alertData.totalGreens,
      };

      if (dismissed && alertData.isNovoPico) {
        setDismissed(false);
      }

      setHighlightPulse(true);
      if (soundEnabled && alertData.probabilidadeAcertos >= 55) {
        tocarAlerta();
      }

      timer = setTimeout(() => {
        setHighlightPulse(false);
      }, 2500);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [alertData, soundEnabled, dismissed]);

  // Drag handlers para mover o grid flutuante pela tela
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, select")) return;

    isDraggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    const currentX = position?.x ?? Math.max(16, window.innerWidth - 500);
    const currentY = position?.y ?? Math.max(70, window.innerHeight - 440);

    dragOffsetRef.current = {
      x: e.clientX - currentX,
      y: e.clientY - currentY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;

    const width = containerRef.current?.offsetWidth || 480;
    const height = containerRef.current?.offsetHeight || 320;

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
          localStorage.setItem("roleta_grid_flutuante_pos", JSON.stringify(position));
        } catch {}
      }
    }
  };

  // ESTILO DE FUNDO PRETO RAJADO EM FORMATO DE FOLHAS (HERRINGBONE LEAF-VEIN PATTERN)
  const LEAF_CARBON_STYLE: React.CSSProperties = {
    backgroundColor: "#050602",
    backgroundImage: `
      radial-gradient(ellipse at 50% 0%, rgba(255, 230, 0, 0.16) 0%, transparent 65%),
      radial-gradient(ellipse at 80% 100%, rgba(255, 200, 0, 0.08) 0%, transparent 50%),
      /* Nervuras de folha em espinha (leaf vein twill 55° e -55°) */
      repeating-linear-gradient(55deg, rgba(255, 230, 0, 0.07) 0px, rgba(255, 230, 0, 0.07) 1.5px, transparent 1.5px, transparent 10px),
      repeating-linear-gradient(-55deg, rgba(255, 230, 0, 0.07) 0px, rgba(255, 230, 0, 0.07) 1.5px, transparent 1.5px, transparent 10px),
      repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.7) 0px, rgba(0, 0, 0, 0.7) 3px, transparent 3px, transparent 6px),
      linear-gradient(145deg, #0a0b03 0%, #030401 50%, #080902 100%)
    `,
  };

  // Se nenhum giro foi registrado ainda
  if (spins.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`fixed z-50 transition-all select-none ${className}`}
        style={{
          left: position ? `${position.x}px` : "auto",
          top: position ? `${position.y}px` : "auto",
          right: position ? "auto" : "1.5rem",
          bottom: position ? "auto" : "6rem",
        }}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative flex items-center gap-2.5 rounded-2xl border-2 border-[#FFE600] px-4 py-2.5 shadow-[0_0_25px_rgba(255,230,0,0.55),inset_0_0_12px_rgba(255,230,0,0.2)] select-none backdrop-blur-md cursor-grab active:cursor-grabbing overflow-hidden"
          style={LEAF_CARBON_STYLE}
        >
          <MetalScrew className="top-1 left-1" />
          <MetalScrew className="top-1 right-1" />
          <MetalScrew className="bottom-1 left-1" />
          <MetalScrew className="bottom-1 right-1" />

          <GripHorizontal className="h-4 w-4 text-[#FFE600] animate-pulse shrink-0 ml-1.5" />
          <div className="flex flex-col text-left mr-1.5">
            <span className="font-display text-[10px] font-black uppercase text-[#FFE600] tracking-wider drop-shadow-[0_0_8px_#FFE600]">
              RADAR FLUTUANTE TÁTICO
            </span>
            <span className="text-[9px] text-white/80 font-mono">
              Aguardando giros para rastreamento
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!alertData) {
    return null;
  }

  const {
    padraoLider,
    duziaIndicada,
    colunaIndicada,
    probabilidadeAcertos,
    taxaG1,
    totalGreens,
    totalReds,
    totalRodadas,
    ultimoResultado,
    alvosIntersecao,
    mensagemTatica,
  } = alertData;

  // Se o componente foi dispensado ou fechado, não renderiza nada
  if (dismissed) {
    onClose?.();
    return null;
  }

  // =========================================================================
  // MODO MINIMIZADO (Pílula Flutuante Deslocável em Amarelo Neon com Parafusos)
  // =========================================================================
  if (minimized) {
    return (
      <div
        ref={containerRef}
        className={`fixed z-50 transition-all select-none ${className}`}
        style={{
          left: position ? `${position.x}px` : "auto",
          top: position ? `${position.y}px` : "auto",
          right: position ? "auto" : "1.5rem",
          bottom: position ? "auto" : "6rem",
        }}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`relative group flex items-center gap-2 sm:gap-3 rounded-2xl border-2 p-2 sm:px-4 sm:py-2.5 shadow-[0_0_30px_rgba(255,230,0,0.65),inset_0_0_15px_rgba(255,230,0,0.2)] select-none cursor-grab active:cursor-grabbing overflow-hidden ${
            isCritico
              ? "border-[#FF0055] shadow-[0_0_35px_rgba(255,0,85,0.85)] ring-2 ring-[#FFE600]"
              : "border-[#FFE600]"
          }`}
          style={LEAF_CARBON_STYLE}
        >
          {/* Parafusos nos 4 cantos */}
          <MetalScrew className="top-1 left-1" />
          <MetalScrew className="top-1 right-1" />
          <MetalScrew className="bottom-1 left-1" />
          <MetalScrew className="bottom-1 right-1" />

          <div
            className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl shadow-[0_0_14px_rgba(255,230,0,0.8)] animate-pulse shrink-0 ml-1.5 ${
              isCritico ? "bg-[#FF0055] text-white" : "bg-[#FFE600] text-black"
            }`}
          >
            <Zap className="h-4 w-4 fill-current" />
          </div>

          <div className="flex flex-col min-w-0 pr-1">
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black uppercase text-[#FFE600] tracking-wider">
              <span>{padraoLider.code} LÍDER</span>
              <span className="text-white/60">·</span>
              <span className="text-white">{probabilidadeAcertos.toFixed(1)}%</span>
              {isCritico && (
                <span className="rounded bg-[#FF0055] px-1 py-0.2 text-[8px] font-black text-white animate-pulse">
                  CRÍTICO
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold text-white truncate">
              <span className="text-[#FFE600]">{duziaIndicada.nome}</span>
              <span className="text-white/40">×</span>
              <span className="text-[#FFE600]">{colunaIndicada.nome}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMinimized(false);
            }}
            title="Expandir Grid Flutuante"
            className="rounded-lg border border-[#FFE600]/60 bg-black/60 p-1 text-[#FFE600] hover:bg-[#FFE600] hover:text-black transition-colors cursor-pointer mr-1"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
              onClose?.();
            }}
            title="Fechar Grid Flutuante"
            className="rounded-lg border border-white/40 bg-black/60 p-1 text-white/70 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer mr-1.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MODO EXPANDIDO COMPLETO: GRID FLUTUANTE DESLOCÁVEL EM AMARELO NEON
  // FUNDO PRETO RAJADO EM FORMATO DE FOLHAS + 4 PARAFUSOS METÁLICOS
  // =========================================================================
  return (
    <aside
      ref={containerRef}
      aria-label="Grid Flutuante Deslocável de Notificações e Assertividade"
      className={`fixed z-50 w-[calc(100vw-1rem)] sm:w-[490px] max-w-[500px] select-none ${
        highlightPulse ? "scale-[1.02]" : ""
      } ${className}`}
      style={{
        left: position ? `${position.x}px` : "auto",
        top: position ? `${position.y}px` : "auto",
        right: position ? "auto" : "1.5rem",
        bottom: position ? "auto" : "6rem",
      }}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border-2 p-3 sm:p-4 backdrop-blur-xl shadow-2xl transition-all ${
          isCritico
            ? "border-[#FF0055] shadow-[0_0_45px_rgba(255,0,85,0.8),inset_0_0_20px_rgba(255,0,85,0.25)] ring-2 ring-[#FFE600]/80"
            : "border-[#FFE600] shadow-[0_0_40px_rgba(255,230,0,0.65),inset_0_0_20px_rgba(255,230,0,0.2)]"
        }`}
        style={LEAF_CARBON_STYLE}
      >
        {/* PARAFUSOS METÁLICOS INDUSTRIAIS NOS 4 CANTOS */}
        <MetalScrew className="top-2 left-2" />
        <MetalScrew className="top-2 right-2" />
        <MetalScrew className="bottom-2 left-2" />
        <MetalScrew className="bottom-2 right-2" />

        {/* Textura sutil de nervura foliar rajada (Watermark SVG) */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-15"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="leaf-veins-pattern"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(25)"
            >
              <path
                d="M 30 0 L 30 60 M 30 15 L 5 5 M 30 30 L 5 20 M 30 45 L 5 35 M 30 15 L 55 5 M 30 30 L 55 20 M 30 45 L 55 35"
                stroke="#FFE600"
                strokeWidth="0.8"
                fill="none"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#leaf-veins-pattern)" />
        </svg>

        {/* =====================================================================
            1. CABEÇALHO TÁTICO COM ALÇA DE ARRASTE (DESLOCÁVEL)
            ===================================================================== */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative z-10 flex items-center justify-between border-b border-[#FFE600]/30 pb-2 mb-2.5 cursor-grab active:cursor-grabbing px-1"
          title="Clique e arraste para mover este painel livremente pela tela"
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Ícone de Arraste & Indicador de Status */}
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg shadow-md shrink-0 ${
                isCritico
                  ? "bg-[#FF0055] text-white shadow-[0_0_12px_#FF0055] animate-pulse"
                  : "bg-[#FFE600] text-black shadow-[0_0_12px_#FFE600]"
              }`}
            >
              <GripHorizontal className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`font-display text-xs font-black uppercase tracking-wider ${
                    isCritico
                      ? "text-[#FF1744] drop-shadow-[0_0_8px_#FF1744]"
                      : "text-[#FFE600] drop-shadow-[0_0_8px_#FFE600]"
                  }`}
                >
                  {isCritico ? "🚨 RADAR CRÍTICO · DISPARO" : "GRID FLUTUANTE DESLOCÁVEL"}
                </span>

                {isCritico ? (
                  <span className="rounded bg-[#FF0055] px-1.5 py-0.2 font-mono text-[8px] font-black text-white shadow-[0_0_8px_#FF0055] animate-pulse">
                    ALERTA CONFIRMADO
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 rounded bg-[#FFE600] px-1 py-0.2 font-mono text-[8px] font-black text-black">
                    <ShieldCheck className="h-2.5 w-2.5" /> &gt;60% OK
                  </span>
                )}
              </div>
              <p className="text-[9.5px] text-white/80 font-mono truncate">
                Líder: <strong className="text-[#FFE600]">{padraoLider.code}</strong> · {padraoLider.nome}
              </p>
            </div>
          </div>

          {/* Botões de Ação do Topo */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {/* Botão de Som */}
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              title={soundEnabled ? "Desativar alerta sonoro" : "Ativar alerta sonoro"}
              className="rounded-lg border border-[#FFE600]/40 bg-black/70 p-1.5 text-[#FFE600] hover:bg-[#FFE600]/20 transition-colors cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-white/40" />
              )}
            </button>

            {/* Alternar Grid Normal na Tela */}
            {onToggleGridNormal && (
              <button
                type="button"
                onClick={onToggleGridNormal}
                title={isGridNormalVisible ? "Ocultar Grid Normal na Página" : "Exibir Grid Normal na Página"}
                className={`rounded-lg border p-1.5 transition-colors cursor-pointer ${
                  isGridNormalVisible
                    ? "border-cyan-400 bg-cyan-950/70 text-cyan-300"
                    : "border-white/20 bg-black/70 text-white/40 hover:text-white"
                }`}
              >
                {isGridNormalVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            )}

            {/* Minimizar */}
            <button
              type="button"
              onClick={() => setMinimized(true)}
              title="Minimizar para pílula flutuante"
              className="rounded-lg border border-[#FFE600]/40 bg-black/70 p-1.5 text-[#FFE600] hover:bg-[#FFE600]/20 transition-colors cursor-pointer"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>

            {/* Fechar / Desativar */}
            <button
              type="button"
              onClick={() => {
                setDismissed(true);
                onClose?.();
              }}
              title="Desativar radar flutuante"
              className="rounded-lg border border-white/20 bg-black/70 p-1.5 text-white/70 hover:bg-red-500/30 hover:text-red-300 hover:border-red-500/50 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ALTERNÂNCIA DE ABAS INTERNAS NO HUD (LÍDER vs ALERTAS CRÍTICOS) */}
        <div className="relative z-10 flex border-b border-[#FFE600]/20 mb-2.5">
          <button
            type="button"
            onClick={() => setAbaAtiva("lider")}
            className={`flex-1 py-1 text-center text-[10px] font-display font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              abaAtiva === "lider"
                ? "text-[#FFE600] border-b-2 border-[#FFE600] bg-[#FFE600]/10 drop-shadow-[0_0_6px_#FFE600]"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Zap className="h-3 w-3" />
            <span>Padrão Líder & Alvos</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva("alertas")}
            className={`flex-1 py-1 text-center text-[10px] font-display font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              abaAtiva === "alertas"
                ? "text-[#FF1744] border-b-2 border-[#FF1744] bg-[#FF1744]/15 drop-shadow-[0_0_6px_#FF1744]"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <BellRing className="h-3 w-3 text-[#FF1744]" />
            <span>Alertas Expert ({alertasFiltrados.length})</span>
          </button>
        </div>

        {/* =====================================================================
            2. CONTEÚDO PRINCIPAL DO GRID FLUTUANTE
            ===================================================================== */}
        {abaAtiva === "lider" ? (
          <>
            {/* GRID DE 3 BLOCOS (DÚZIA, COLUNA, ACERTO) EM AMARELO NEON */}
            <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-2.5 mb-2.5">
              {/* CARD 1: QUAL DÚZIA */}
              <div className="flex flex-col justify-between rounded-xl border border-[#FFE600]/50 bg-black/85 p-2 sm:p-2.5 shadow-[0_0_12px_rgba(255,230,0,0.2)]">
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black uppercase text-[#FFE600] tracking-tight">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3 text-[#FFE600]" />
                    DÚZIA
                  </span>
                  <span className="text-[8px] text-white/60 font-mono">#{duziaIndicada.idx}</span>
                </div>

                <div className="my-1 text-center">
                  <span className="font-display text-xs sm:text-sm font-black text-white drop-shadow-[0_0_6px_#FFE600] block">
                    {duziaIndicada.nome}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-[#FFE600]/90 font-mono block">
                    ({duziaIndicada.faixa})
                  </span>
                </div>

                <div className="border-t border-[#FFE600]/20 pt-1 text-[8px] sm:text-[8.5px] font-mono text-white/80 flex items-center justify-between">
                  <span>Força:</span>
                  <span className="font-bold text-[#FFE600]">{duziaIndicada.perc.toFixed(0)}%</span>
                </div>
              </div>

              {/* CARD 2: QUAL COLUNA */}
              <div className="flex flex-col justify-between rounded-xl border border-[#FFE600]/50 bg-black/85 p-2 sm:p-2.5 shadow-[0_0_12px_rgba(255,230,0,0.2)]">
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black uppercase text-[#FFE600] tracking-tight">
                  <span className="flex items-center gap-1">
                    <Columns3 className="h-3 w-3 text-[#FFE600]" />
                    COLUNA
                  </span>
                  <span className="text-[8px] text-white/60 font-mono">#{colunaIndicada.idx}</span>
                </div>

                <div className="my-1 text-center">
                  <span className="font-display text-xs sm:text-sm font-black text-white drop-shadow-[0_0_6px_#FFE600] block">
                    {colunaIndicada.nome}
                  </span>
                  <span
                    className="text-[8px] sm:text-[9px] text-[#FFE600]/90 font-mono block truncate"
                    title={colunaIndicada.faixa}
                  >
                    Foco {colunaIndicada.idx}ª
                  </span>
                </div>

                <div className="border-t border-[#FFE600]/20 pt-1 text-[8px] sm:text-[8.5px] font-mono text-white/80 flex items-center justify-between">
                  <span>Força:</span>
                  <span className="font-bold text-[#FFE600]">{colunaIndicada.perc.toFixed(0)}%</span>
                </div>
              </div>

              {/* CARD 3: PROBABILIDADE DE ACERTOS */}
              <div
                className={`flex flex-col justify-between rounded-xl border-2 bg-black/95 p-2 sm:p-2.5 shadow-[0_0_18px_rgba(255,230,0,0.35)] relative overflow-hidden ${
                  isCritico
                    ? "border-[#FF0055] shadow-[0_0_20px_rgba(255,0,85,0.6)]"
                    : "border-[#FFE600]"
                }`}
              >
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black uppercase text-[#FFE600] tracking-tight">
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-[#FFE600]" />
                    ACERTO
                  </span>
                  <Flame
                    className={`h-3 w-3 ${
                      isCritico ? "text-[#FF0055] animate-bounce" : "text-[#FFE600]"
                    }`}
                  />
                </div>

                <div className="my-1 text-center">
                  <span
                    className={`font-display text-lg sm:text-xl font-black block leading-tight ${
                      isCritico
                        ? "text-[#FF1744] drop-shadow-[0_0_10px_#FF1744]"
                        : "text-[#FFE600] drop-shadow-[0_0_10px_#FFE600]"
                    }`}
                  >
                    {probabilidadeAcertos.toFixed(1)}%
                  </span>
                  <span className="text-[7.5px] text-white/70 font-mono block">
                    {totalGreens}W · {totalReds}L ({totalRodadas}g)
                  </span>
                </div>

                <div className="border-t border-white/20 pt-1 text-center">
                  <span
                    className={`inline-block w-full rounded py-0.2 px-1 text-[7.5px] font-mono font-black uppercase ${
                      ultimoResultado === "GREEN"
                        ? "bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/50"
                        : ultimoResultado === "RED"
                        ? "bg-red-500/20 text-red-300 border border-red-500/50"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    Último: {ultimoResultado ?? "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* ALVOS DE INTERSEÇÃO DIRETA (4 NÚMEROS DE OURO) */}
            <div className="relative z-10 rounded-xl border border-[#FFE600]/40 bg-black/80 p-2 sm:p-2.5 mb-2">
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                <span className="text-[9px] sm:text-[10px] font-black uppercase text-white/90 flex items-center gap-1">
                  <span
                    className={`h-1.5 w-1.5 rounded-full animate-ping ${
                      isCritico ? "bg-[#FF0055]" : "bg-[#FFE600]"
                    }`}
                  />
                  NÚMEROS NA INTERSEÇÃO ({duziaIndicada.idx}ª Dúzia × {colunaIndicada.idx}ª Coluna):
                </span>
                <span className="text-[8px] text-[#FFE600] font-mono font-bold">
                  G1: {taxaG1.toFixed(0)}% assertividade
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {alvosIntersecao.map((num) => {
                    const bg = corDoNumero(num);
                    const isBlack = bg === "#000000";
                    const isRed = bg === "#FF003C";
                    return (
                      <button
                        key={`intersec-btn-${num}`}
                        type="button"
                        onClick={() => onSelectNumber?.(num)}
                        title={`Número ${num} na confluência máxima · Clique para registrar`}
                        className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg font-mono text-xs sm:text-sm font-black text-white text-stroke-black transition-all hover:scale-115 cursor-pointer shadow-md"
                        style={{
                          background: bg,
                          border: isBlack
                            ? "2px solid #FFFFFF"
                            : isRed
                            ? "2px solid #FF003C"
                            : "2px solid #FFE600",
                          boxShadow: isRed
                            ? "0 0 10px rgba(255,0,60,0.85)"
                            : isBlack
                            ? "0 0 8px rgba(255,255,255,0.75)"
                            : "0 0 10px rgba(255,230,0,0.85)",
                        }}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>

                <div className="ml-auto text-right text-[8.5px] font-mono text-white/70 hidden sm:block">
                  {mensagemTatica}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ===================================================================
              ABA 2: LISTA DE ALERTAS CRÍTICOS & CONFLUÊNCIA
              =================================================================== */
          <div className="relative z-10 space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {totalOcultados > 0 && (
              <div className="flex items-center justify-between px-2 py-1 text-[8.5px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 rounded-lg mb-1 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                <span className="font-bold flex items-center gap-1">
                  <span>🛡️</span>
                  <span>BLINDAGEM CONTRA RUÍDO</span>
                </span>
                <span className="text-white/80">{totalOcultados} ruídos ocultados</span>
              </div>
            )}

            {alertasFiltrados.length > 0 ? (
              alertasFiltrados.map((al) => {
                const isItemCritico = al.priority >= 90 || al.accuracy2Entries >= 70;
                return (
                  <div
                    key={`alert-item-${al.id}`}
                    className={`rounded-xl border p-2 flex items-center justify-between gap-2 ${
                      isItemCritico
                        ? "border-[#FF0055] bg-red-950/40 shadow-[0_0_12px_rgba(255,0,85,0.4)]"
                        : "border-[#FFE600]/40 bg-black/75 shadow-[0_0_8px_rgba(255,230,0,0.15)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-md font-mono text-[10px] font-black ${
                          isItemCritico
                            ? "bg-[#FF0055] text-white"
                            : "bg-[#FFE600] text-black"
                        }`}
                      >
                        {isItemCritico ? "!" : "P"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-display font-black text-white uppercase tracking-tight truncate">
                          {al.title}
                        </div>
                        <div className="text-[8.5px] text-white/60 font-mono truncate">
                          {al.targetLabel} · {al.accuracyLabel}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {al.targetNumbers.slice(0, 3).map((n: number) => (
                        <button
                          key={`al-target-${al.id}-${n}`}
                          type="button"
                          onClick={() => onSelectNumber?.(n)}
                          className="flex h-5 w-5 items-center justify-center rounded bg-black/90 border border-[#FFE600]/60 font-mono text-[9px] font-bold text-[#FFE600] hover:scale-110"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-5 px-3 text-center space-y-1 rounded-xl border border-white/20 bg-black/70">
                <span className="text-xs font-black uppercase text-amber-300 block tracking-wide">
                  RADAR INSTITUCIONAL EM ESPERA QUALIFICADA
                </span>
                <p className="text-[9.5px] font-mono text-white/80">
                  Nenhum alerta atingiu o critério de alta assertividade. Ruídos irrelevantes permanecem ocultos.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Rodapé / Barra Informativa */}
        <div className="relative z-10 flex items-center justify-between text-[8px] sm:text-[8.5px] font-mono text-white/60 border-t border-[#FFE600]/20 pt-1.5">
          <span className="truncate">
            Padrão: <strong className="text-[#FFE600]">{padraoLider.code}</strong> · {padraoLider.regraDescricao}
          </span>
          <span className="text-[#FFE600] font-bold shrink-0 ml-2">RODADAS: {totalRodadas}</span>
        </div>
      </div>
    </aside>
  );
}
