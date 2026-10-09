import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  TrendingUp,
  RotateCcw,
  Undo2,
  Maximize2,
  Minimize2,
  X,
  GripHorizontal,
  Crown,
} from "lucide-react";
import {
  analisarCombinacoesTolerancia,
  type CombinacaoToleranciaResultado,
} from "@/lib/combination-tolerance-engine";
import { MiniGraficoCombinacaoTolerancia } from "./MiniGraficoCombinacaoTolerancia";
import type { UnifiedAlertItem } from "@/lib/alert-confluence";
import type { MostAssertivePatternAlert } from "@/lib/pattern-tracker-engine";

/**
 * ESTILOS DE FUNDO ROXO E PRETO RAJADO (TWILL / CARBON FIBER STRIPES)
 * COM BORDAS BRANCAS E FONTES BRANCAS NEGRITO PURAS
 */
const PURPLE_BLACK_RAJADO_STYLE: React.CSSProperties = {
  backgroundColor: "#080112",
  backgroundImage: `
    radial-gradient(ellipse at 50% 0%, rgba(147, 51, 234, 0.28) 0%, transparent 70%),
    radial-gradient(ellipse at 80% 100%, rgba(126, 34, 206, 0.22) 0%, transparent 60%),
    repeating-linear-gradient(45deg, rgba(147, 51, 234, 0.18) 0px, rgba(147, 51, 234, 0.18) 2px, transparent 2px, transparent 12px),
    repeating-linear-gradient(-45deg, rgba(168, 85, 247, 0.14) 0px, rgba(168, 85, 247, 0.14) 2px, transparent 2px, transparent 12px),
    repeating-linear-gradient(135deg, rgba(0, 0, 0, 0.88) 0px, rgba(0, 0, 0, 0.88) 4px, transparent 4px, transparent 8px),
    linear-gradient(160deg, #130222 0%, #06000c 50%, #150226 100%)
  `,
};

const HEADER_RAJADO_STYLE: React.CSSProperties = {
  backgroundColor: "#16032b",
  backgroundImage: `
    repeating-linear-gradient(45deg, rgba(168, 85, 247, 0.18) 0px, rgba(168, 85, 247, 0.18) 2px, transparent 2px, transparent 12px),
    repeating-linear-gradient(-45deg, rgba(126, 34, 206, 0.14) 0px, rgba(126, 34, 206, 0.14) 2px, transparent 2px, transparent 12px),
    linear-gradient(180deg, rgba(28, 4, 51, 0.97) 0%, rgba(14, 2, 26, 0.98) 100%)
  `,
};

export interface RadarPadroesFlutuanteProps {
  externalNumbers?: number[] | undefined;
  onAddNumber?: ((num: number) => void) | undefined;
  className?: string | undefined;
  defaultVisible?: boolean | undefined;
  onClose?: (() => void) | undefined;
  alerts?: UnifiedAlertItem[] | undefined;
  tacticalPatternAlert?: MostAssertivePatternAlert | null | undefined;
  onOpenRadarQuantitativo?: (() => void) | undefined;
}

export function RadarPadroesFlutuante({
  externalNumbers,
  onAddNumber,
  className = "",
  defaultVisible = true,
  onClose,
  onOpenRadarQuantitativo,
}: RadarPadroesFlutuanteProps) {
  // 1. HISTÓRICO DE GIROS (SINCRONIZADO OU LOCAL)
  const [localHistory, setLocalHistory] = useState<number[]>(() => {
    if (typeof window === "undefined") return [14, 2, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2];
    try {
      const saved = localStorage.getItem("radar_padroes_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [14, 2, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2];
  });

  const activeNumbers = useMemo(() => {
    if (externalNumbers && externalNumbers.length > 0) {
      return externalNumbers;
    }
    return localHistory;
  }, [externalNumbers, localHistory]);

  // 2. CONTROLES DE JANELA DESLIZANTE (SLIDING WINDOW: 15 A 30 GIROS)
  const [sampleSize, setSampleSize] = useState<number>(() => {
    if (typeof window === "undefined") return 25;
    try {
      const saved = localStorage.getItem("radar_padroes_sample_size");
      return saved ? Math.max(15, Math.min(30, parseInt(saved, 10))) : 25;
    } catch {
      return 25;
    }
  });

  const alterarSampleSize = (sz: number) => {
    const clamped = Math.max(15, Math.min(30, sz));
    setSampleSize(clamped);
    try {
      localStorage.setItem("radar_padroes_sample_size", String(clamped));
    } catch {}
  };

  // 3. ESTADOS DE INTERFACE
  const [inputVal, setInputVal] = useState<string>("");
  const [visible, setVisible] = useState<boolean>(defaultVisible);
  const [minimized, setMinimized] = useState<boolean>(false);

  // 4. POSIÇÃO FLUTUANTE ARRASTÁVEL (DRAGGABLE)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("radar_padroes_pos");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    if (!position && typeof window !== "undefined") {
      const initialX = Math.max(16, window.innerWidth - 530);
      const initialY = Math.max(70, window.innerHeight - 560);
      setPosition({ x: initialX, y: initialY });
    }
  }, [position]);

  // Persiste histórico local
  useEffect(() => {
    if (!externalNumbers && typeof window !== "undefined") {
      try {
        localStorage.setItem("radar_padroes_history", JSON.stringify(localHistory));
      } catch {}
    }
  }, [localHistory, externalNumbers]);

  // Inserção rápida de número
  const handleAddNumber = (num: number) => {
    if (num < 0 || num > 36 || isNaN(num)) return;
    if (onAddNumber) {
      onAddNumber(num);
    }
    setLocalHistory((prev) => [num, ...prev]);
    setInputVal("");
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(inputVal.trim(), 10);
    if (!isNaN(val) && val >= 0 && val <= 36) {
      handleAddNumber(val);
    }
  };

  const handleUndo = () => {
    setLocalHistory((prev) => prev.slice(1));
  };

  const handleClear = () => {
    setLocalHistory([]);
  };

  // 5. MOTOR DE FREQUÊNCIAS GRÁFICAS & TOLERÂNCIA DE COMBINAÇÕES
  const combinacoesTolerancia: CombinacaoToleranciaResultado = useMemo(() => {
    return analisarCombinacoesTolerancia(activeNumbers, sampleSize);
  }, [activeNumbers, sampleSize]);

  if (!visible) return null;

  // =========================================================================
  // MODO MINIMIZADO (PÍLULA COMPACTA FLUTUANTE)
  // =========================================================================
  if (minimized) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          position: "fixed",
          left: position?.x ?? 20,
          top: position?.y ?? 100,
          zIndex: 60,
        }}
        onDragEnd={(_, info) => {
          const newPos = {
            x: (position?.x ?? 20) + info.offset.x,
            y: (position?.y ?? 100) + info.offset.y,
          };
          setPosition(newPos);
          try {
            localStorage.setItem("radar_padroes_pos", JSON.stringify(newPos));
          } catch {}
        }}
        className={`select-none cursor-grab active:cursor-grabbing font-sans ${className}`}
      >
        <div
          style={PURPLE_BLACK_RAJADO_STYLE}
          className="flex items-center gap-2.5 rounded-2xl border-2 border-white px-3.5 py-2 shadow-[0_0_25px_rgba(255,255,255,0.45),inset_0_0_12px_rgba(255,255,255,0.2)] backdrop-blur-xl text-white"
        >
          <GripHorizontal className="h-4 w-4 text-white opacity-90" />
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20 border-2 border-white text-white animate-pulse shadow-[0_0_10px_#ffffff]">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col pr-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase text-white tracking-wider">
                MINI GRÁFICO
              </span>
              <span className="rounded bg-white text-black font-black px-1.5 py-0.2 text-[8.5px] shadow-[0_0_8px_#ffffff]">
                {combinacoesTolerancia.melhorGlobal.taxaG1.toFixed(0)}% G1
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-black text-white">
              <span className="text-white truncate max-w-[160px]">
                {combinacoesTolerancia.melhorGlobal.nome}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 border-l-2 border-white/60 pl-1">
            {onOpenRadarQuantitativo && (
              <button
                type="button"
                onClick={onOpenRadarQuantitativo}
                className="flex h-6 w-6 items-center justify-center rounded border border-amber-400 bg-amber-500/30 text-amber-300 hover:bg-amber-400 hover:text-black transition-colors cursor-pointer"
                title="Abrir Radar Quantitativo"
              >
                <Crown className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={() => setMinimized(false)}
              className="flex h-6 w-6 items-center justify-center rounded border border-white bg-white/20 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
              title="Expandir Mini Gráfico"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
            <button
              onClick={() => {
                setVisible(false);
                onClose?.();
              }}
              className="flex h-6 w-6 items-center justify-center rounded border border-white/60 bg-black/80 text-white hover:bg-rose-600 hover:border-white transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // =========================================================================
  // DASHBOARD FLUTUANTE (EXCLUSIVAMENTE O MINI GRÁFICO)
  // =========================================================================
  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ scale: 0.96, opacity: 0, y: 15 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      style={{
        position: "fixed",
        left: position?.x ?? 20,
        top: position?.y ?? 100,
        zIndex: 60,
      }}
      onDragEnd={(_, info) => {
        const newPos = {
          x: (position?.x ?? 20) + info.offset.x,
          y: (position?.y ?? 100) + info.offset.y,
        };
        setPosition(newPos);
        try {
          localStorage.setItem("radar_padroes_pos", JSON.stringify(newPos));
        } catch {}
      }}
      className={`w-[94vw] sm:w-[480px] md:w-[500px] select-none font-sans ${className}`}
      data-component="mini-grafico-flutuante"
    >
      <div
        style={PURPLE_BLACK_RAJADO_STYLE}
        className="relative flex flex-col rounded-3xl border-2 border-white shadow-[0_0_35px_rgba(255,255,255,0.45),inset_0_0_20px_rgba(255,255,255,0.18)] backdrop-blur-2xl overflow-hidden text-white max-h-[88vh]"
      >
        {/* CABEÇALHO */}
        <div
          style={HEADER_RAJADO_STYLE}
          className="flex items-center justify-between border-b-2 border-white/50 px-3.5 py-2.5 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-2 min-w-0">
            <GripHorizontal className="h-4 w-4 text-white opacity-90 shrink-0" />
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20 border-2 border-white text-white shadow-[0_0_12px_rgba(255,255,255,0.6)] shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  Analisador Estatístico
                </h2>
                <span className="rounded bg-white border border-white px-1.5 py-0.2 text-[8.5px] font-black text-black shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                  MINI GRÁFICO
                </span>
              </div>
              <p className="text-[9px] text-white/90 font-mono font-bold truncate">
                Tolerância de 2 Erros · Dúzias & Colunas
              </p>
            </div>
          </div>

          {/* CONTROLES DO CABEÇALHO */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* BOTÃO PARA ABRIR RADAR QUANTITATIVO SEPARADO */}
            {onOpenRadarQuantitativo && (
              <button
                type="button"
                onClick={onOpenRadarQuantitativo}
                className="flex items-center gap-1 rounded-lg border-2 border-amber-400 bg-amber-500/20 hover:bg-amber-400 hover:text-black text-amber-300 px-2 py-1 text-[9px] font-mono font-black transition-all cursor-pointer shadow-[0_0_10px_rgba(251,191,36,0.35)]"
                title="Abrir Radar Quantitativo Separado (Sinais Qualificados Expert & Máximo)"
              >
                <Crown className="h-3 w-3 text-amber-300" />
                <span className="hidden sm:inline">Radar Quant</span>
              </button>
            )}

            {/* BOTÃO LIMPAR HISTÓRICO */}
            <button
              onClick={handleClear}
              className="flex items-center gap-1 rounded-lg border-2 border-white/70 bg-black/60 px-2 py-1 text-[9px] font-mono font-black text-white hover:bg-white hover:text-black transition-all shadow-[0_0_6px_rgba(255,255,255,0.3)] cursor-pointer"
              title="Limpar histórico"
            >
              <RotateCcw className="h-3 w-3" />
            </button>

            {/* BOTÃO DESFAZER ÚLTIMO */}
            <button
              onClick={handleUndo}
              disabled={activeNumbers.length === 0}
              className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-white/70 bg-black/60 text-white hover:bg-white hover:text-black disabled:opacity-40 transition-colors cursor-pointer"
              title="Desfazer último número"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>

            {/* BOTÃO MINIMIZAR */}
            <button
              onClick={() => setMinimized(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-white/70 bg-black/60 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
              title="Minimizar para Pílula"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>

            {/* BOTÃO FECHAR */}
            <button
              onClick={() => {
                setVisible(false);
                onClose?.();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-white/70 bg-black/60 text-white hover:bg-rose-600 hover:border-white transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* BARRA DE ENTRADA RÁPIDA & JANELA DESLIZANTE */}
        <div
          style={HEADER_RAJADO_STYLE}
          className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-white/40 px-3.5 py-1.5"
        >
          <form onSubmit={handleInputSubmit} className="flex items-center gap-1.5">
            <span className="text-[9.5px] font-black uppercase text-white font-mono tracking-wider">
              Entrada:
            </span>
            <input
              type="number"
              min={0}
              max={36}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="0-36"
              className="w-12 rounded-lg border-2 border-white bg-black/90 px-1.5 py-0.5 text-center font-mono text-xs font-black text-white placeholder-white/40 focus:border-white focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-white border-2 border-white px-2 py-0.5 text-[9px] font-black uppercase text-black hover:bg-white/80 transition-colors shadow-[0_0_10px_rgba(255,255,255,0.6)] cursor-pointer"
            >
              + Inserir
            </button>
          </form>

          {/* SELETOR DE JANELA DESLIZANTE */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-mono font-black text-white">
              Janela:
            </span>
            {[15, 20, 25, 30].map((sz) => (
              <button
                key={sz}
                onClick={() => alterarSampleSize(sz)}
                className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-black transition-all cursor-pointer ${
                  sampleSize === sz
                    ? "bg-white text-black shadow-[0_0_8px_#ffffff] border-2 border-white"
                    : "bg-black/60 text-white hover:bg-white/20 border border-white/60"
                }`}
              >
                {sz}G
              </button>
            ))}
          </div>
        </div>

        {/* CORPO DO GRID FLUTUANTE: APENAS O MINI GRÁFICO */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-3 sm:p-3.5">
          <MiniGraficoCombinacaoTolerancia
            resultado={combinacoesTolerancia}
            onSelectNumber={handleAddNumber}
            isPinned={true}
          />
        </div>
      </div>
    </motion.div>
  );
}
