import React, { useState, useMemo } from "react";
import {
  Flame,
  Activity,
  Shield,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  analisarCurvaTermicaAltaDensidade,
  type AnaliseTermicaResultado,
} from "@/lib/curva-termica-engine";
import type { Spin } from "@/lib/roulette";

export interface CurvaTermicaAltaDensidadeProps {
  spinsOuNumeros: (number | Spin)[];
  sampleSize?: number;
  onSelectNumber?: (num: number) => void;
  className?: string;
  defaultExpanded?: boolean;
}

export function CurvaTermicaAltaDensidade({
  spinsOuNumeros,
  sampleSize = 25,
  onSelectNumber,
  className = "",
  defaultExpanded = true,
}: CurvaTermicaAltaDensidadeProps) {
  const [expandido, setExpandido] = useState<boolean>(defaultExpanded);
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  const analise: AnaliseTermicaResultado = useMemo(() => {
    return analisarCurvaTermicaAltaDensidade(spinsOuNumeros, sampleSize);
  }, [spinsOuNumeros, sampleSize]);

  const handleCopiarAlvos = () => {
    if (analise.nucleoAlvosQuentes.length === 0) return;
    const txt = analise.nucleoAlvosQuentes.join(", ");
    navigator.clipboard.writeText(txt);
    toast.success("Núcleo Térmico Copiado!", {
      description: `Alvos (${analise.nucleoAlvosQuentes.length}): ${txt}`,
    });
  };

  // Cores dinâmicas baseadas no status
  const isAltaDensidade = analise.statusConfianca === "ALTA_DENSIDADE_CONFIRMADA";
  const isAquecendo = analise.statusConfianca === "DENSIDADE_EM_AQUECIMENTO";

  const corStatusTheme = isAltaDensidade
    ? {
        border: "border-amber-400",
        glow: "shadow-[0_0_30px_rgba(251,191,36,0.35)]",
        badgeBg: "bg-gradient-to-r from-amber-400 to-yellow-500 text-black",
        lineStroke: "#fbbf24",
        gradientStart: "rgba(251, 191, 36, 0.45)",
        gradientEnd: "rgba(251, 191, 36, 0.0)",
        textColor: "text-amber-300",
      }
    : isAquecendo
    ? {
        border: "border-cyan-400",
        glow: "shadow-[0_0_25px_rgba(34,211,238,0.25)]",
        badgeBg: "bg-gradient-to-r from-cyan-400 to-blue-500 text-black",
        lineStroke: "#22d3ee",
        gradientStart: "rgba(34, 211, 238, 0.35)",
        gradientEnd: "rgba(34, 211, 238, 0.0)",
        textColor: "text-cyan-300",
      }
    : {
        border: "border-white/40",
        glow: "shadow-[0_0_15px_rgba(255,255,255,0.15)]",
        badgeBg: "bg-black/80 text-emerald-400 border border-emerald-500/40",
        lineStroke: "#94a3b8",
        gradientStart: "rgba(148, 163, 184, 0.20)",
        gradientEnd: "rgba(148, 163, 184, 0.0)",
        textColor: "text-slate-300",
      };

  // Cálculo dos pontos do SVG da Curva Térmica
  const svgData = useMemo(() => {
    const pontos = analise.pontosCurva;
    if (pontos.length < 2) return null;

    const width = 480;
    const height = 90;
    const paddingX = 14;
    const paddingY = 12;

    const maxVal = 100;
    const minVal = 0;

    const coords = pontos.map((pt, idx) => {
      const x = paddingX + (idx / (pontos.length - 1)) * (width - paddingX * 2);
      const y = height - paddingY - ((pt.curvaSuavizada - minVal) / (maxVal - minVal)) * (height - paddingY * 2);
      return { x, y, pt };
    });

    // Gera linha Bézier suave
    let pathD = `M ${coords[0]!.x} ${coords[0]!.y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i]!;
      const next = coords[i + 1]!;
      const cpx = (curr.x + next.x) / 2;
      pathD += ` C ${cpx} ${curr.y}, ${cpx} ${next.y}, ${next.x} ${next.y}`;
    }

    // Linha de fechamento para o gradiente preenchido
    const lastX = coords[coords.length - 1]!.x;
    const firstX = coords[0]!.x;
    const bottomY = height - paddingY;
    const fillPathD = `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    // Linha do limiar 88%
    const limiarY = height - paddingY - ((88 - minVal) / (maxVal - minVal)) * (height - paddingY * 2);

    return {
      width,
      height,
      coords,
      pathD,
      fillPathD,
      limiarY,
    };
  }, [analise.pontosCurva]);

  return (
    <div
      className={`rounded-2xl border-2 ${corStatusTheme.border} ${corStatusTheme.glow} bg-gradient-to-b from-[#110e1a] via-[#090810] to-[#040407] text-white p-3 sm:p-3.5 transition-all font-sans select-none ${className}`}
    >
      {/* =====================================================================
          CABEÇALHO COMPACTO COM MEDIDOR HDCI & CONTROLE EXPANSÍVEL
          ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/20 pb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-xl font-black shadow-md ${
              isAltaDensidade
                ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-black shadow-[0_0_12px_#fbbf24] animate-pulse"
                : "bg-white/10 text-white border border-white/30"
            }`}
          >
            <Flame className="h-4 w-4" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-white">
                CURVA TÉRMICA & HDCI
              </span>
              <span
                className={`rounded px-1.5 py-0.2 text-[8px] font-black uppercase shadow-sm ${corStatusTheme.badgeBg}`}
              >
                {isAltaDensidade
                  ? "👑 ALTA DENSIDADE (CONFIRMADO)"
                  : isAquecendo
                  ? "⚡ EM AQUECIMENTO TÉRMICO"
                  : "🛡️ BLINDAGEM ATIVA"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-slate-300">
              <span>Taxa:</span>
              <strong className={corStatusTheme.textColor}>{analise.gradienteTexto}</strong>
              <span>·</span>
              <span className="text-emerald-400 font-bold">
                {analise.ruidosSuprimidosPerc}% ruídos eliminados
              </span>
            </div>
          </div>
        </div>

        {/* MEDIDOR DIGITAL DO ÍNDICE DE CONFIANÇA (HDCI) */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex flex-col items-end">
            <span className="text-[7.5px] font-mono font-bold uppercase text-slate-400">
              Índice Confiança
            </span>
            <div className="flex items-baseline gap-1">
              <span
                className={`text-base sm:text-lg font-black font-mono leading-none ${
                  isAltaDensidade
                    ? "text-amber-300 drop-shadow-[0_0_8px_#fbbf24]"
                    : isAquecendo
                    ? "text-cyan-300"
                    : "text-white"
                }`}
              >
                {analise.indiceConfianca}%
              </span>
              <span className="text-[8px] font-mono text-slate-400">HDCI</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/30 bg-black/60 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
            title={expandido ? "Recolher Curva Térmica" : "Expandir Curva Térmica"}
          >
            {expandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* =====================================================================
          CORPO EXPANSÍVEL: GRÁFICO TÉRMICO, FITA DO CILINDRO & NÚCLEO SNIPER
          ===================================================================== */}
      {expandido && (
        <div className="pt-2.5 space-y-3">
          {/* 1. GRÁFICO DA CURVA TÉRMICA SUAVIZADA (SVG PURO) */}
          <div className="relative rounded-xl border border-white/20 bg-black/80 p-2 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between text-[8px] font-mono text-slate-300 mb-1 px-1">
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-amber-400" />
                <span>Curva de Temperatura Suavizada (Filtro Anti-Ruído Passa-Baixa)</span>
              </span>
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                Limiar 88% (Zona de Alta Assertividade)
              </span>
            </div>

            {svgData ? (
              <div className="relative w-full overflow-x-auto custom-scrollbar">
                <svg
                  viewBox={`0 0 ${svgData.width} ${svgData.height}`}
                  className="w-full h-20 sm:h-24 overflow-visible"
                >
                  <defs>
                    <linearGradient id="termicaFillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={corStatusTheme.gradientStart} />
                      <stop offset="100%" stopColor={corStatusTheme.gradientEnd} />
                    </linearGradient>
                  </defs>

                  {/* Linhas de Grade de Apoio */}
                  <line
                    x1="14"
                    y1={svgData.limiarY}
                    x2={svgData.width - 14}
                    y2={svgData.limiarY}
                    stroke="#fbbf24"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.75"
                  />
                  <text
                    x={svgData.width - 16}
                    y={svgData.limiarY - 3}
                    textAnchor="end"
                    fill="#fbbf24"
                    fontSize="7"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    GATILHO 88%
                  </text>

                  {/* Preenchimento sob a curva */}
                  <path d={svgData.fillPathD} fill="url(#termicaFillGrad)" />

                  {/* Linha da Curva Suavizada */}
                  <path
                    d={svgData.pathD}
                    fill="none"
                    stroke={corStatusTheme.lineStroke}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Pontos Interativos com Marcadores */}
                  {svgData.coords.map((c, idx) => {
                    const isLast = idx === svgData.coords.length - 1;
                    const isPico = c.pt.isPicoAltaDensidade;
                    const isHovered = hoveredPointIdx === idx;

                    return (
                      <g
                        key={`pt-curva-${idx}`}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPointIdx(idx)}
                        onMouseLeave={() => setHoveredPointIdx(null)}
                        onClick={() => onSelectNumber?.(c.pt.numeroGiro)}
                      >
                        <circle
                          cx={c.x}
                          cy={c.y}
                          r={isLast ? 4 : isPico ? 3.5 : isHovered ? 4.5 : 2}
                          fill={isPico ? "#fbbf24" : isLast ? "#ffffff" : corStatusTheme.lineStroke}
                          stroke="#000000"
                          strokeWidth="1.5"
                        />
                        {isLast && (
                          <circle
                            cx={c.x}
                            cy={c.y}
                            r="7"
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth="1"
                            className="animate-ping"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Tooltip Dinâmico ao passar o mouse */}
                {hoveredPointIdx !== null && svgData.coords[hoveredPointIdx] && (
                  <div
                    className="absolute z-20 pointer-events-none rounded-md border border-white/40 bg-black/95 px-2 py-1 text-[8px] font-mono text-white shadow-xl -translate-x-1/2 -translate-y-full"
                    style={{
                      left: `${(svgData.coords[hoveredPointIdx]!.x / svgData.width) * 100}%`,
                      top: `${svgData.coords[hoveredPointIdx]!.y - 6}px`,
                    }}
                  >
                    <div className="font-bold text-amber-300">
                      Giro: {svgData.coords[hoveredPointIdx]!.pt.numeroGiro} ({svgData.coords[hoveredPointIdx]!.pt.rodadaLabel})
                    </div>
                    <div>Temp: {svgData.coords[hoveredPointIdx]!.pt.curvaSuavizada}°C</div>
                    <div>Densidade: {svgData.coords[hoveredPointIdx]!.pt.densidadeCluster}%</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs font-mono text-slate-400">
                Aguardando registro de ao menos 5 giros para traçar a curva...
              </div>
            )}
          </div>

          {/* 2. FITA TÉRMICA DO CILINDRO EUROPEU (37 NÚMEROS ORDENADOS FISICAMENTE) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[8px] font-mono text-slate-300 px-1">
              <span>Fita Térmica do Cilindro (Roda Física)</span>
              <span>Cores: Azul Frio (0°C) → Amarelo Quente → Vermelho Incandescente (100°C)</span>
            </div>

            <div className="flex items-center gap-0.5 overflow-x-auto custom-scrollbar p-1 rounded-xl bg-black/90 border border-white/20">
              {analise.fitaCilindroTermico.map((item) => {
                const temp = item.temperatura;
                // Gradiente térmico customizado
                const heatColor =
                  temp >= 80
                    ? "#ef4444" // Vermelho incandescente
                    : temp >= 60
                    ? "#f59e0b" // Âmbar quente
                    : temp >= 40
                    ? "#eab308" // Amarelo
                    : temp >= 20
                    ? "#06b6d4" // Ciano frio
                    : "#334155"; // Azul escuro neutro

                return (
                  <button
                    key={`fita-num-${item.numero}`}
                    type="button"
                    onClick={() => onSelectNumber?.(item.numero)}
                    title={`Número ${item.numero} · Temperatura: ${temp}°C · Presença: ${item.densidadePerc}%`}
                    className={`flex flex-col items-center justify-between w-6 h-10 rounded shrink-0 p-0.5 font-mono text-[8px] font-black transition-all hover:scale-115 cursor-pointer ${
                      item.isSupernova
                        ? "border-2 border-amber-300 shadow-[0_0_10px_#fbbf24] animate-pulse"
                        : "border border-white/20"
                    }`}
                    style={{
                      background: item.cor === "red" ? "#450a0a" : item.cor === "black" ? "#020617" : "#064e3b",
                    }}
                  >
                    <span
                      className={`leading-none ${
                        item.cor === "red"
                          ? "text-rose-400"
                          : item.cor === "black"
                          ? "text-slate-200"
                          : "text-emerald-400"
                      }`}
                    >
                      {item.numero}
                    </span>

                    {/* Barra de Calor */}
                    <div className="w-full h-3.5 bg-black/70 rounded-sm overflow-hidden flex flex-col justify-end">
                      <div
                        className="w-full transition-all duration-500 rounded-sm"
                        style={{
                          height: `${Math.max(15, temp)}%`,
                          backgroundColor: heatColor,
                          boxShadow: temp >= 65 ? `0 0 6px ${heatColor}` : "none",
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. NÚCLEO DE ALVOS QUENTES & BOTÃO COPIAR ALVOS */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/25 bg-black/85 p-2 sm:p-2.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase text-amber-300 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>NÚCLEO TÉRMICO DE ALTA DENSIDADE</span>
                </span>
                <span className="rounded bg-white/10 px-1.5 py-0.2 text-[8px] font-mono text-white/90 border border-white/20">
                  {analise.nucleoAlvosLabel}
                </span>
              </div>
              <p className="text-[9px] font-mono text-slate-300 max-w-md">
                {analise.justificativaAssertiva}
              </p>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1">
                {analise.nucleoAlvosQuentes.map((num) => (
                  <button
                    key={`alvo-quente-${num}`}
                    type="button"
                    onClick={() => onSelectNumber?.(num)}
                    title={`Número ${num} no núcleo quente · Clique para registrar`}
                    className="flex h-6 w-6 items-center justify-center rounded-lg font-mono text-[9px] font-black text-black bg-gradient-to-br from-amber-300 to-yellow-500 hover:scale-115 transition-transform shadow-[0_0_8px_rgba(251,191,36,0.6)] cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleCopiarAlvos}
                className="flex items-center gap-1 rounded-lg border border-amber-400 bg-amber-400/20 hover:bg-amber-400 hover:text-black px-2 py-1 text-[8.5px] font-mono font-bold text-amber-300 transition-all cursor-pointer shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                title="Copiar números do núcleo quente para apostar"
              >
                <Copy className="h-3 w-3" />
                <span>Copiar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
