import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { BarChart3, TrendingUp, Layers, CheckCircle2, AlertCircle } from "lucide-react";
import { CYBER_REDS } from "@/lib/cyber-balistica-engine";
import {
  calcularLeiDoTerceiro,
  getCicloAtual,
  type LeiDoTerceiroResult,
  TEORICO_LEI_TERCEIRO,
} from "@/lib/three-tier-engine";

// Registrar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface CyberChartProps {
  numeros: number[];
  leiDoTerceiro?: LeiDoTerceiroResult | undefined;
  onSelectNumber?: ((num: number) => void) | undefined;
}

export function CyberChart({ numeros, leiDoTerceiro: leiProp, onSelectNumber }: CyberChartProps) {
  // Ciclo de 37 giros para a Lei do Terceiro
  const cicloAtual = useMemo(() => {
    return getCicloAtual(numeros);
  }, [numeros]);

  // Lei do Terceiro (calculada no ciclo de 37 giros se não vier via props)
  const lei = useMemo(() => {
    return leiProp ?? calcularLeiDoTerceiro(cicloAtual);
  }, [leiProp, cicloAtual]);

  const frequencias = lei.frequencias;

  // Labels de 0 a 36
  const labels = useMemo(() => {
    return Array.from({ length: 37 }, (_, i) => i.toString());
  }, []);

  // Cores dinâmicas por categoria da Lei do Terceiro
  const { backgroundColors, borderColors } = useMemo(() => {
    const bg: string[] = [];
    const border: string[] = [];

    for (let i = 0; i <= 36; i++) {
      const cat = lei.classificacaoNumeros[i];
      if (cat === "repetido") {
        // Verde Neon para Repetidos (>= 2x)
        bg.push("rgba(0, 255, 136, 0.65)");
        border.push("#00FF88");
      } else if (cat === "unico") {
        // Cyan Neon para Únicos (1x)
        bg.push("rgba(8, 247, 254, 0.55)");
        border.push("#08f7fe");
      } else {
        // Ausentes (0x): Linha base com opacidade suave
        bg.push("rgba(255, 255, 255, 0.05)");
        border.push("rgba(255, 255, 255, 0.2)");
      }
    }
    return { backgroundColors: bg, borderColors: border };
  }, [lei.classificacaoNumeros]);

  const data = useMemo(() => {
    return {
      labels,
      datasets: [
        {
          label: "Frequência no Ciclo",
          data: frequencias,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1.5,
          borderRadius: 4,
          hoverBackgroundColor: "#ff003c",
          hoverBorderColor: "#ffffff",
          hoverBorderWidth: 2,
        },
      ],
    };
  }, [labels, frequencias, backgroundColors, borderColors]);

  const options: ChartOptions<"bar"> = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 350,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "#0d0f12",
          titleColor: "#08f7fe",
          bodyColor: "#ffffff",
          borderColor: "#08f7fe",
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const num = parseInt(items[0]?.label || "0", 10);
              const cor = num === 0 ? "VERDE (ZERO)" : CYBER_REDS.includes(num) ? "VERMELHO" : "PRETO";
              return `NÚMERO ${num} · ${cor}`;
            },
            label: (item) => {
              const val = item.raw as number;
              const num = parseInt(item.label || "0", 10);
              const cat = lei.classificacaoNumeros[num];
              const catNome = cat === "repetido" ? "REPETIDO (>=2x)" : cat === "unico" ? "ÚNICO (1x)" : "AUSENTE (0x)";
              return [
                `Frequência: ${val}x no ciclo de 37 giros`,
                `Lei do Terceiro: ${catNome}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.04)",
          },
          ticks: {
            color: "#8892b0",
            font: {
              family: "monospace",
              size: 9,
              weight: "bold",
            },
          },
        },
        y: {
          beginAtZero: true,
          suggestedMax: 4,
          grid: {
            color: "rgba(255, 255, 255, 0.05)",
          },
          ticks: {
            stepSize: 1,
            color: "#8892b0",
            font: {
              family: "monospace",
              size: 10,
            },
          },
        },
      },
    };
  }, [lei.classificacaoNumeros]);

  // Encontra os números mais repetidos (quentes)
  const quentes = useMemo(() => {
    return labels
      .map((numStr, i) => ({ num: parseInt(numStr, 10), count: frequencias[i]! }))
      .filter((item) => item.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [labels, frequencias]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#0d0f12] p-4 shadow-xl font-mono">
      {/* CABEÇALHO DO GRÁFICO */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#08f7fe]" />
          <h3 className="text-xs sm:text-sm font-black uppercase text-white tracking-wider">
            DISPERSÃO & FREQUÊNCIA — LEI DO TERCEIRO (0 a 36)
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#8892b0]">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-[#00FF88] shadow-[0_0_6px_#00FF88]" />
            Repetidos (≥2x)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-[#08f7fe] shadow-[0_0_6px_#08f7fe]" />
            Únicos (1x)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-white/20 border border-white/40" />
            Ausentes (0x)
          </span>
        </div>
      </div>

      {/* =========================================================================
          CONTADORES DA LEI DO TERCEIRO (DISCREPÂNCIA VS MÉTRICA TEÓRICA DE 36.2%)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
        {/* CARD AUSENTES */}
        <div className="rounded-xl border border-white/10 bg-black/50 p-2.5 shadow-sm">
          <div className="flex items-center justify-between text-[9px] uppercase font-bold text-[#8892b0] mb-0.5">
            <span>NÚMEROS AUSENTES</span>
            <span className="text-amber-400">Teórico: 36,2%</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-white">
                {lei.totalAusentes}
              </span>
              <span className="text-xs text-[#8892b0]">/ 37</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-white font-mono">
                {lei.percAusentes}%
              </span>
              <span
                className={`block text-[9px] font-bold ${
                  Math.abs(lei.discrepanciaAusentes) > 5 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                Δ {lei.discrepanciaAusentes > 0 ? `+${lei.discrepanciaAusentes}` : lei.discrepanciaAusentes}%
              </span>
            </div>
          </div>
        </div>

        {/* CARD ÚNICOS */}
        <div className="rounded-xl border border-cyan-500/30 bg-black/50 p-2.5 shadow-sm">
          <div className="flex items-center justify-between text-[9px] uppercase font-bold text-[#8892b0] mb-0.5">
            <span className="text-[#08f7fe]">NÚMEROS ÚNICOS</span>
            <span className="text-[#8892b0]">Teórico: 37,3%</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-[#08f7fe] drop-shadow-[0_0_8px_#08f7fe]">
                {lei.totalUnicos}
              </span>
              <span className="text-xs text-[#8892b0]">/ 37</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-[#08f7fe] font-mono">
                {lei.percUnicos}%
              </span>
              <span className="block text-[9px] font-bold text-slate-400">
                Δ {lei.discrepanciaUnicos > 0 ? `+${lei.discrepanciaUnicos}` : lei.discrepanciaUnicos}%
              </span>
            </div>
          </div>
        </div>

        {/* CARD REPETIDOS */}
        <div className="rounded-xl border border-emerald-500/30 bg-black/50 p-2.5 shadow-sm">
          <div className="flex items-center justify-between text-[9px] uppercase font-bold text-[#8892b0] mb-0.5">
            <span className="text-[#00FF88]">NÚMEROS REPETIDOS</span>
            <span className="text-[#8892b0]">Teórico: 26,5%</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-[#00FF88] drop-shadow-[0_0_8px_#00FF88]">
                {lei.totalRepetidos}
              </span>
              <span className="text-xs text-[#8892b0]">/ 37</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-[#00FF88] font-mono">
                {lei.percRepetidos}%
              </span>
              <span className="block text-[9px] font-bold text-emerald-400">
                Δ {lei.discrepanciaRepetidos > 0 ? `+${lei.discrepanciaRepetidos}` : lei.discrepanciaRepetidos}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA DO GRÁFICO CHART.JS */}
      <div className="relative min-h-[250px] w-full flex-1">
        <Bar data={data} options={options} />
      </div>

      {/* RODAPÉ DO GRÁFICO COM REPETIÇÕES NOTÁVEIS */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-[10px]">
        <div className="flex items-center gap-1 text-[#8892b0]">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          <span>REPETIÇÕES NOTÁVEIS (LEI DO TERCEIRO):</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {quentes.length === 0 ? (
            <span className="text-[#8892b0]">Nenhum número repetido ainda</span>
          ) : (
            quentes.map((q) => {
              const isRed = CYBER_REDS.includes(q.num);
              return (
                <button
                  key={`top-freq-${q.num}`}
                  type="button"
                  onClick={() => onSelectNumber?.(q.num)}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold cursor-pointer transition hover:scale-105 ${
                    q.num === 0
                      ? "bg-[#00E676] text-white border border-[#00FF88] shadow-[0_0_8px_#00FF88]"
                      : isRed
                      ? "bg-[#FF003C] text-white border border-[#FF003C] shadow-[0_0_8px_#FF003C]"
                      : "bg-[#000000] text-white border border-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                  }`}
                >
                  <span>{q.num}</span>
                  <span className="text-[8px] text-[#00FF88] font-black">({q.count}x)</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
