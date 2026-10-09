import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Target,
  Award,
  Pin,
  PinOff,
  Layers,
  Columns3,
  Crosshair,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  type CombinacaoToleranciaResultado,
  type CombinacaoToleranciaItem,
  type TipoCombinacao,
} from "@/lib/combination-tolerance-engine";
import { NUMEROS_VERMELHOS } from "@/lib/radar-padroes-engine";

interface MiniGraficoCombinacaoToleranciaProps {
  resultado: CombinacaoToleranciaResultado;
  onSelectNumber?: ((num: number) => void) | undefined;
  className?: string | undefined;
  isPinned?: boolean | undefined;
  onTogglePin?: (() => void) | undefined;
}

export function MiniGraficoCombinacaoTolerancia({
  resultado,
  onSelectNumber,
  className = "",
  isPinned = true,
  onTogglePin,
}: MiniGraficoCombinacaoToleranciaProps) {
  // Categoria de visualização selecionada
  const [categoriaAtiva, setCategoriaAtiva] = useState<"TODAS" | TipoCombinacao>("TODAS");

  // Combinação exibida com base na categoria
  const comboSelecionado: CombinacaoToleranciaItem = useMemo(() => {
    switch (categoriaAtiva) {
      case "DUZIA_DUZIA":
        return resultado.melhorDuziaDuzia;
      case "COLUNA_COLUNA":
        return resultado.melhorColunaColuna;
      case "DUZIA_COLUNA":
        return resultado.melhorDuziaColuna;
      case "TODAS":
      default:
        return resultado.melhorGlobal;
    }
  }, [categoriaAtiva, resultado]);

  const curva = comboSelecionado.curvaTolerancia;

  // Cálculo de coordenadas SVG para a curva gráfica
  const svgMetrics = useMemo(() => {
    if (!curva || curva.length === 0) {
      return { path: "", areaPath: "", zeroY: 35, pontosCoords: [] };
    }

    const width = 360;
    const height = 75;
    const paddingX = 14;
    const paddingY = 12;

    const values = curva.map((p) => p.pontos);
    const minVal = Math.min(0, ...values);
    const maxVal = Math.max(1, ...values);
    const range = maxVal - minVal || 1;

    const coords = curva.map((pt, idx) => {
      const x =
        curva.length === 1
          ? width / 2
          : paddingX + (idx / (curva.length - 1)) * (width - 2 * paddingX);
      const y =
        height - paddingY - ((pt.pontos - minVal) / range) * (height - 2 * paddingY);
      return { x, y, pt };
    });

    const pathD = coords.reduce((acc, c, idx) => {
      return idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
    }, "");

    const first = coords[0]!;
    const last = coords[coords.length - 1]!;
    const areaD = `${pathD} L ${last.x} ${height} L ${first.x} ${height} Z`;

    const zeroY =
      height - paddingY - ((0 - minVal) / range) * (height - 2 * paddingY);

    return { path: pathD, areaPath: areaD, zeroY, pontosCoords: coords };
  }, [curva]);

  return (
    <div
      className={`rounded-2xl border-2 border-white p-3 space-y-2.5 shadow-[0_0_25px_rgba(255,255,255,0.4)] backdrop-blur-xl relative overflow-hidden ${className}`}
      style={{
        backgroundColor: "#0d0219",
        backgroundImage: `
          repeating-linear-gradient(45deg, rgba(168, 85, 247, 0.16) 0px, rgba(168, 85, 247, 0.16) 2px, transparent 2px, transparent 12px),
          repeating-linear-gradient(-45deg, rgba(126, 34, 206, 0.12) 0px, rgba(126, 34, 206, 0.12) 2px, transparent 2px, transparent 12px),
          repeating-linear-gradient(135deg, rgba(0, 0, 0, 0.80) 0px, rgba(0, 0, 0, 0.80) 3px, transparent 3px, transparent 6px),
          linear-gradient(145deg, rgba(22, 3, 38, 0.96) 0%, rgba(8, 1, 16, 0.98) 100%)
        `,
      }}
    >
      {/* 1. CABEÇALHO COM TÍTULO E BOTÃO DE FIXAÇÃO */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b-2 border-white/40 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-black font-black shadow-[0_0_10px_#ffffff] shrink-0">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wide text-white">
                MINI GRÁFICO · FREQUÊNCIAS E TOLERÂNCIA
              </span>
              <span className="rounded bg-white border border-white px-1.5 py-0.2 text-[8px] font-black text-black uppercase shadow-[0_0_8px_#ffffff]">
                ATÉ 2 ENTRADAS (G1)
              </span>
            </div>
            <p className="text-[9px] text-white/80 font-mono font-bold">
              Curva de tolerância de 2 erros (Dúzia x Coluna, Dúzia x Dúzia, Coluna x Coluna)
            </p>
          </div>
        </div>

        {onTogglePin && (
          <button
            type="button"
            onClick={onTogglePin}
            title={isPinned ? "Desafixar do topo" : "Fixar no topo"}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border-2 text-[8.5px] font-mono font-black transition-all cursor-pointer ${
              isPinned
                ? "bg-white text-black border-white shadow-[0_0_10px_#ffffff]"
                : "bg-black/60 text-white border-white/60 hover:bg-white hover:text-black"
            }`}
          >
            {isPinned ? <Pin className="h-3 w-3 fill-current" /> : <PinOff className="h-3 w-3" />}
            <span>{isPinned ? "FIXADO" : "FIXAR"}</span>
          </button>
        )}
      </div>

      {/* 2. SELETOR DE CATEGORIAS DE COMBINAÇÃO */}
      <div className="grid grid-cols-4 gap-1 bg-black/80 p-1 rounded-xl border-2 border-white/60">
        {[
          { key: "TODAS", label: "⭐ Geral (Melhor)", icon: Award },
          { key: "DUZIA_DUZIA", label: "Dúzia + Dúzia", icon: Layers },
          { key: "COLUNA_COLUNA", label: "Coluna + Coluna", icon: Columns3 },
          { key: "DUZIA_COLUNA", label: "Dúzia + Coluna", icon: Crosshair },
        ].map((tab) => {
          const Icon = tab.icon;
          const isAtivo = categoriaAtiva === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategoriaAtiva(tab.key as any)}
              className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[8.5px] font-mono font-black uppercase transition-all cursor-pointer truncate ${
                isAtivo
                  ? "bg-white text-black shadow-[0_0_10px_#ffffff] border border-white"
                  : "text-white hover:bg-white/20"
              }`}
            >
              <Icon className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. CARD DE DESTAQUE: QUAL É A MELHOR COMBINAÇÃO */}
      <div className="rounded-xl border-2 border-white bg-black/85 p-2.5 space-y-1.5 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-black font-black text-[9px] shadow-[0_0_6px_#ffffff]">
              ★
            </span>
            <span className="text-[9px] font-black uppercase text-white/90">
              MELHOR COMBINAÇÃO {comboSelecionado.tipoLabel.toUpperCase()}:
            </span>
            <span className="text-xs sm:text-sm font-black text-white underline truncate">
              {comboSelecionado.nome}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="rounded bg-white border border-white px-2 py-0.5 text-[9px] font-mono font-black text-black shadow-[0_0_10px_#ffffff]">
              {comboSelecionado.taxaG1.toFixed(1)}% G1
            </span>
            <span className="rounded bg-black border-2 border-white px-1.5 py-0.5 text-[8.5px] font-mono font-black text-white">
              {comboSelecionado.pontosTolerancia >= 0
                ? `+${comboSelecionado.pontosTolerancia} pts`
                : `${comboSelecionado.pontosTolerancia} pts`}
            </span>
          </div>
        </div>

        {/* 4. VISUALIZAÇÃO GRÁFICA DA CURVA DE TOLERÂNCIA (SPARKLINE SVG) */}
        <div className="relative w-full rounded-lg bg-black/90 border border-white/50 p-2 overflow-hidden">
          <div className="flex items-center justify-between text-[8px] font-mono font-black text-white/70 mb-1">
            <span>Início Janela</span>
            <span className="text-white">Curva de Pontuação c/ Tolerância de 2 Erros</span>
            <span className="text-white font-bold">
              Último: {comboSelecionado.pontosTolerancia} pts
            </span>
          </div>

          <div className="relative h-[75px] w-full">
            <svg
              viewBox="0 0 360 75"
              preserveAspectRatio="none"
              className="h-full w-full overflow-visible"
            >
              <defs>
                <linearGradient id={`grad-combo-${comboSelecionado.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Linha Zero / Linha d'água */}
              <line
                x1="0"
                y1={svgMetrics.zeroY}
                x2="360"
                y2={svgMetrics.zeroY}
                stroke="#FFFFFF"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.3"
              />

              {/* Área preenchida sob a curva */}
              {svgMetrics.areaPath && (
                <path
                  d={svgMetrics.areaPath}
                  fill={`url(#grad-combo-${comboSelecionado.id})`}
                />
              )}

              {/* Linha da Curva de Tolerância */}
              {svgMetrics.path && (
                <path
                  d={svgMetrics.path}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.85))" }}
                />
              )}

              {/* Pontos da curva */}
              {svgMetrics.pontosCoords.map((c, i) => (
                <circle
                  key={`pt-${i}`}
                  cx={c.x}
                  cy={c.y}
                  r={i === svgMetrics.pontosCoords.length - 1 ? 4.5 : c.pt.isHit ? 2.5 : 1.5}
                  fill={
                    c.pt.isDoubleHit
                      ? "#FFE600"
                      : c.pt.isHit
                      ? "#FFFFFF"
                      : "#FF0055"
                  }
                  stroke="#000000"
                  strokeWidth={1}
                />
              ))}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[7.5px] font-mono font-black text-white/60 mt-1 border-t border-white/20 pt-1">
            <span>● Branco = Acerto (+1)</span>
            <span>● Amarelo = Interseção Dupla (+2)</span>
            <span>● Vermelho = Erro (-1 a cada 2)</span>
          </div>
        </div>

        {/* 5. MÉTRICAS COMPARATIVAS ATÉ 2 ENTRADAS */}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg border-2 border-white/60 bg-black/80 p-1.5">
            <span className="text-[8px] font-mono uppercase text-white/70 block font-bold">
              1ª Entrada (Direto)
            </span>
            <span className="text-xs sm:text-sm font-black text-white block">
              {comboSelecionado.acertosG0}x
            </span>
            <span className="text-[7.5px] font-mono text-white/80">
              {((comboSelecionado.acertosG0 / (comboSelecionado.totalCiclos || 1)) * 100).toFixed(0)}% do total
            </span>
          </div>

          <div className="rounded-lg border-2 border-white/60 bg-black/80 p-1.5">
            <span className="text-[8px] font-mono uppercase text-white/70 block font-bold">
              2ª Entrada (G1)
            </span>
            <span className="text-xs sm:text-sm font-black text-white block">
              {comboSelecionado.acertosG1}x
            </span>
            <span className="text-[7.5px] font-mono text-white/80">
              Proteção Salva
            </span>
          </div>

          <div className="rounded-lg border-2 border-white/60 bg-black/80 p-1.5">
            <span className="text-[8px] font-mono uppercase text-white/70 block font-bold">
              Quebras (2 Reds)
            </span>
            <span className="text-xs sm:text-sm font-black text-white block">
              {comboSelecionado.totalRedsG1}x
            </span>
            <span className="text-[7.5px] font-mono text-white/80">
              Fora de Tolerância
            </span>
          </div>
        </div>

        {/* 6. ALVOS RECOMENDADOS CLICÁVEIS */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[8.5px] font-mono font-black text-white uppercase">
            Alvos Recomendados ({comboSelecionado.alvos.length}):
          </span>

          {comboSelecionado.alvosIntersecao && comboSelecionado.alvosIntersecao.length > 0 && (
            <span className="rounded bg-white border border-white px-1.5 py-0.2 text-[7.5px] font-black uppercase text-black shadow-[0_0_6px_#ffffff]">
              4 OURO INTERSEÇÃO
            </span>
          )}

          <div className="flex flex-wrap items-center gap-1">
            {comboSelecionado.alvos.slice(0, 16).map((num) => {
              const isRed = NUMEROS_VERMELHOS.has(num);
              const isIntersecao = comboSelecionado.alvosIntersecao?.includes(num);

              return (
                <button
                  key={`combo-num-${comboSelecionado.id}-${num}`}
                  type="button"
                  onClick={() => onSelectNumber?.(num)}
                  title={`Inserir número ${num}${isIntersecao ? " (Interseção de Ouro)" : ""}`}
                  className={`flex h-5 w-5 items-center justify-center rounded text-[8.5px] font-black font-mono text-white border-2 transition-transform hover:scale-125 cursor-pointer ${
                    isIntersecao
                      ? "border-[#FFE600] ring-1 ring-[#FFE600] shadow-[0_0_8px_#FFE600]"
                      : "border-white"
                  } ${
                    num === 0
                      ? "bg-emerald-600"
                      : isRed
                      ? "bg-rose-600"
                      : "bg-slate-950"
                  }`}
                >
                  {num}
                </button>
              );
            })}
            {comboSelecionado.alvos.length > 16 && (
              <span className="text-[8.5px] font-mono text-white font-black">
                +{comboSelecionado.alvos.length - 16}
              </span>
            )}
          </div>
        </div>

        {/* 7. RECOMENDAÇÃO TÁTICA */}
        <div className="rounded-lg bg-black/80 border border-white/60 p-2 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-white animate-pulse shrink-0" />
          <p className="text-[9.5px] font-mono font-black text-white leading-tight">
            {comboSelecionado.recomendacaoTatica}
          </p>
        </div>
      </div>
    </div>
  );
}
